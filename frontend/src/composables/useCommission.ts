import { computed, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createSharedComposable, useIntervalFn, useUrlSearchParams } from '@vueuse/core'
import { useDossierStore } from '@/stores/dossier.store'
import { wantsFastAnim } from '@/lib/fast-anim'
import type { CommissionLevel, CommissionPhase } from '@/api/commission'
import { COMMISSION_ANIMATION_MS, isCommissionLevel } from '@/api/commission'

/**
 * Воронка вывода: уровни 1…4, фазы, таймер анимации, демо-флаг админа.
 *
 * L2: animating идёт по ТАЙМЕРУ 7 минут (не по «концу» canvas-loop).
 *     Когда timer=0 → suspended (ошибка вывода) → pay_fee (комиссия) →
 *     messenger (заготовки) → waiting → админ на L3.
 * L4: таймер 3 мин → tg_final.
 *
 * ?fastAnim=1 / localStorage velora:fastAnim=1 — только для стенда
 * (L2 → 12 с, L4 → 10 с). В проде без флага — полные 7 / 3 мин.
 */

const FAST_L2_MS = 12_000
const FAST_L4_MS = 10_000

export interface CommissionApi {
  level: ComputedRef<CommissionLevel>
  phase: ComputedRef<CommissionPhase>
  feeCents: ComputedRef<number>
  feeEuros: ComputedRef<number>
  feeReason: ComputedRef<'base' | 'insurance' | 'aml' | 'release'>
  animationMs: ComputedRef<number>
  /** 0…1 прогресс анимации перевода */
  animationProgress: Ref<number>
  /** Осталось мс анимации (для подписи) */
  animationRemainingMs: ComputedRef<number>
  policyProgress: ComputedRef<number>
  isReady: ComputedRef<boolean>
  isPayFee: ComputedRef<boolean>
  isMessenger: ComputedRef<boolean>
  isWaiting: ComputedRef<boolean>
  isAnimating: ComputedRef<boolean>
  /** Hold после 100% анимации или phase=failed — сцена в режиме отказа. */
  isRejectAnim: ComputedRef<boolean>
  isSuspended: ComputedRef<boolean>
  isPolicyBuild: ComputedRef<boolean>
  isFailed: ComputedRef<boolean>
  /** L4 после чата / L5: финальный handoff в Telegram. */
  isTgFinal: ComputedRef<boolean>
  beginWithdraw: () => boolean
  confirmFeePaid: () => void
  confirmMessageSent: () => void
  openFeeFromSuspension: () => void
  openFeeFromFailure: () => void
  /** Демо: ?commLevel=2 или вызов из стенда */
  applyAdminLevel: (level: CommissionLevel) => void
}

let urlLevelApplied = false

function createCommission(): CommissionApi {
  const dossierStore = useDossierStore()
  const { dossier } = storeToRefs(dossierStore)

  const params = useUrlSearchParams('history')

  // Демо-флаг админа из URL — один раз на вкладку.
  if (!urlLevelApplied) {
    const rawLevel = params.commLevel
    if (typeof rawLevel === 'string') {
      const n = Number(rawLevel)
      if (isCommissionLevel(n)) {
        urlLevelApplied = true
        dossierStore.advanceCommissionLevel(n)
        if (n === 3) {
          /* lazy: useCpiBuild не импортируем наверху (shared composable order) */
          queueMicrotask(() => {
            void import('@/composables/useCpiBuild').then(({ useCpiBuild }) => {
              useCpiBuild().restartGeneration()
            })
          })
        }
      }
    }
  }

  const level = computed(() => dossier.value.commission.level)
  const phase = computed(() => dossier.value.commission.phase)
  const feeCents = computed(() => dossier.value.commission.fee.amountCents)
  const feeEuros = computed(() => feeCents.value / 100)
  const feeReason = computed(() => dossier.value.commission.fee.reason)
  const policyProgress = computed(() => dossier.value.commission.policyProgress)

  /**
   * Длительность ТАЙМЕРА (не canvas): L2 = 7 мин, L4 = 3 мин из таблицы.
   * Не берём битый animationMs из storage — иначе отказ срабатывает «сразу».
   */
  const animationMs = computed(() => {
    const lv = level.value
    if (lv === 2 || lv === 4) {
      if (wantsFastAnim()) return lv === 4 ? FAST_L4_MS : FAST_L2_MS
      return COMMISSION_ANIMATION_MS[lv]
    }
    const base = dossier.value.commission.animationMs
    if (!wantsFastAnim() || base === 0) return base
    return base
  })

  /**
   * Прогресс 0…1 = elapsed / timerMs (стенные часы).
   * Canvas крутится в loop независимо; отказ — только когда timer дошёл до 0.
   */
  const terminalReject =
    dossier.value.commission.phase === 'failed' ||
    dossier.value.commission.phase === 'suspended' ||
    dossier.value.commission.phase === 'tg_final'
  const animationProgress = ref(terminalReject ? 1 : 0)
  /**
   * После timer=0: короткая красная «hold», затем completeAnimation
   * (L2 suspended / L4 tg_final) — без запроса к API.
   */
  const rejectHold = ref(false)
  let rejectTimer: ReturnType<typeof setTimeout> | null = null

  /** Короткая пауза UI после 100% таймера, не часть 7 минут. */
  const REJECT_HOLD_MS = wantsFastAnim() ? 900 : 2_000

  function pinRejectProgress(): void {
    animationProgress.value = 1
  }

  function recomputeAnimProgress(): void {
    const started = dossier.value.commission.animationStartedAt
    const total = animationMs.value
    if (phase.value !== 'animating' || started === null || total <= 0) {
      animationProgress.value = phase.value === 'animating' ? 0 : animationProgress.value
      return
    }
    /* Стенные часы с animationStartedAt — единственный критерий «таймер вышел». */
    const elapsed = Date.now() - new Date(started).getTime()
    const ratio = Math.min(1, Math.max(0, elapsed / total))
    animationProgress.value = ratio
    if (ratio >= 1 && !rejectHold.value) {
      rejectHold.value = true
      pinRejectProgress()
      pause()
      if (rejectTimer) clearTimeout(rejectTimer)
      rejectTimer = setTimeout(() => {
        rejectHold.value = false
        rejectTimer = null
        pinRejectProgress()
        /* L2 → suspended (оплати комиссию); L4 → tg_final */
        dossierStore.completeAnimation()
      }, REJECT_HOLD_MS)
    }
  }

  const { pause, resume } = useIntervalFn(recomputeAnimProgress, 250, {
    immediate: false,
  })

  watch(
    phase,
    (p) => {
      if (p === 'animating') {
        rejectHold.value = false
        if (rejectTimer) {
          clearTimeout(rejectTimer)
          rejectTimer = null
        }
        recomputeAnimProgress()
        resume()
        return
      }
      pause()
      rejectHold.value = false
      /* L2 suspended/pay_fee / L4 tg_final: freeze на 100% — не откатывать в «успех». */
      if (p === 'failed' || p === 'suspended' || p === 'tg_final' || p === 'pay_fee') {
        pinRejectProgress()
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (rejectTimer) clearTimeout(rejectTimer)
  })

  /*
   * L3: прогресс bozza polizza (Documenti + Home).
   * ~5 мин до ~98% без fastAnim; с ?fastAnim=1 — быстрее для стенда.
   */
  const { pause: pausePolicy, resume: resumePolicy } = useIntervalFn(
    () => dossierStore.tickPolicyProgress(wantsFastAnim() ? 0.045 : 0.004),
    wantsFastAnim() ? 250 : 500,
    { immediate: false },
  )

  watch(
    phase,
    (p) => {
      if (p === 'policy_build') resumePolicy()
      else pausePolicy()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    pause()
    pausePolicy()
  })

  const animationRemainingMs = computed(() => {
    if (phase.value !== 'animating') return 0
    return Math.max(0, Math.round((1 - animationProgress.value) * animationMs.value))
  })

  return {
    level,
    phase,
    feeCents,
    feeEuros,
    feeReason,
    animationMs,
    animationProgress,
    animationRemainingMs,
    policyProgress,
    isReady: computed(() => phase.value === 'ready'),
    isPayFee: computed(() => phase.value === 'pay_fee'),
    isMessenger: computed(() => phase.value === 'messenger'),
    isWaiting: computed(() => phase.value === 'waiting'),
    isAnimating: computed(() => phase.value === 'animating'),
    /**
     * Сцена «отказ / стоп»: hold после 100%, L4 failed, L2 suspended.
     * Иначе на L2 после анимации пропадала red-X сцена (оставалась только
     * карточка страховки), а на L4 VelTransferAnim жил под failed.
     */
    isRejectAnim: computed(
      () =>
        rejectHold.value ||
        phase.value === 'failed' ||
        phase.value === 'suspended',
    ),
    isSuspended: computed(() => phase.value === 'suspended'),
    isPolicyBuild: computed(() => phase.value === 'policy_build'),
    isFailed: computed(() => phase.value === 'failed'),
    /** Финал после отказной анимации L4 (бывший L5) — lock + Telegram. */
    isTgFinal: computed(() => phase.value === 'tg_final'),
    beginWithdraw: () => dossierStore.beginWithdrawFlow(),
    confirmFeePaid: () => dossierStore.markFeePaid(),
    confirmMessageSent: () => dossierStore.markMessageSent(),
    openFeeFromSuspension: () => dossierStore.openFeeFromSuspension(),
    openFeeFromFailure: () => dossierStore.openFeeFromFailure(),
    applyAdminLevel: (next) => {
      dossierStore.advanceCommissionLevel(next)
      if (next === 3) {
        queueMicrotask(() => {
          void import('@/composables/useCpiBuild').then(({ useCpiBuild }) => {
            useCpiBuild().restartGeneration()
          })
        })
      }
    },
  }
}

/** Один таймер анимации / policy на всё приложение, не на каждый компонент. */
export const useCommission = createSharedComposable(createCommission)
