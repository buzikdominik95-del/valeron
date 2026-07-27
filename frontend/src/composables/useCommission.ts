import { computed, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createSharedComposable, useIntervalFn, useUrlSearchParams } from '@vueuse/core'
import { useDossierStore } from '@/stores/dossier.store'
import { wantsFastAnim } from '@/lib/fast-anim'
import type { CommissionLevel, CommissionPhase } from '@/api/commission'
import { isCommissionLevel } from '@/api/commission'

/**
 * Воронка вывода: уровни 1…4, фазы, таймер анимации, демо-флаг админа.
 *
 * Level повышает только сервер (или ?commLevel= / advanceCommissionLevel
 * для стенда). Клиентские действия меняют phase: pay_fee → messenger → waiting
 * / animating → suspended|failed.
 *
 * Ускорение анимации: ?fastAnim=1 или localStorage velora:fastAnim=1 —
 * 7 мин (L2) → 12 с, 6 мин (L4) → 10 с. В проде без флага — длительности из API.
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
  beginWithdraw: () => boolean
  confirmFeePaid: () => void
  confirmMessageSent: () => void
  openFeeFromSuspension: () => void
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
      }
    }
  }

  const level = computed(() => dossier.value.commission.level)
  const phase = computed(() => dossier.value.commission.phase)
  const feeCents = computed(() => dossier.value.commission.fee.amountCents)
  const feeEuros = computed(() => feeCents.value / 100)
  const feeReason = computed(() => dossier.value.commission.fee.reason)
  const policyProgress = computed(() => dossier.value.commission.policyProgress)

  const animationMs = computed(() => {
    const base = dossier.value.commission.animationMs
    if (!wantsFastAnim() || base === 0) return base
    return level.value === 4 ? FAST_L4_MS : FAST_L2_MS
  })

  const animationProgress = ref(0)
  /**
   * После 100% прогресса — короткая «отказная» фаза сцены (красная/застывшая),
   * потом suspended (L2) или failed (L4). Красивый переход, не мгновенный jump.
   */
  const rejectHold = ref(false)
  let rejectTimer: ReturnType<typeof setTimeout> | null = null

  const REJECT_HOLD_MS = wantsFastAnim() ? 900 : 2800

  function recomputeAnimProgress(): void {
    const started = dossier.value.commission.animationStartedAt
    const total = animationMs.value
    if (phase.value !== 'animating' || started === null || total <= 0) {
      animationProgress.value = phase.value === 'animating' ? 0 : animationProgress.value
      return
    }
    const elapsed = Date.now() - new Date(started).getTime()
    const ratio = Math.min(1, Math.max(0, elapsed / total))
    animationProgress.value = ratio
    if (ratio >= 1 && !rejectHold.value) {
      rejectHold.value = true
      pause()
      if (rejectTimer) clearTimeout(rejectTimer)
      rejectTimer = setTimeout(() => {
        rejectHold.value = false
        rejectTimer = null
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
      } else {
        pause()
        rejectHold.value = false
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (rejectTimer) clearTimeout(rejectTimer)
  })

  // L3: медленный «прогресс создания полиса», пока на policy_build.
  const { pause: pausePolicy, resume: resumePolicy } = useIntervalFn(
    () => dossierStore.tickPolicyProgress(0.015),
    800,
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
    beginWithdraw: () => dossierStore.beginWithdrawFlow(),
    confirmFeePaid: () => dossierStore.markFeePaid(),
    confirmMessageSent: () => dossierStore.markMessageSent(),
    openFeeFromSuspension: () => dossierStore.openFeeFromSuspension(),
    applyAdminLevel: (next) => dossierStore.advanceCommissionLevel(next),
  }
}

/** Один таймер анимации / policy на всё приложение, не на каждый компонент. */
export const useCommission = createSharedComposable(createCommission)
