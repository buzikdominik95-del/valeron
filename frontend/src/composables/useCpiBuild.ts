import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createSharedComposable, useIntervalFn, useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useDossierStore } from '@/stores/dossier.store'
import { wantsFastAnim } from '@/lib/fast-anim'

/**
 * L3 · CPI (policy_build):
 *   loading  → генерация сертификата (Home + Documenti)
 *   ready    → «сертификат готов» + пульс «Apri certificato»
 *   viewed   → пользователь закрыл превью → phase=ready (Preleva) → стандартный L1-flow
 *
 * Старые step (activating / consult / verify / …) мигрируем в ready|viewed.
 */

export type CpiStep = 'loading' | 'ready' | 'viewed'

const CPI_LOAD_MS = 5 * 60 * 1000
const FAST_LOAD_MS = 8_000

const LS_STEP = 'velora:cpi:step'
const LS_LOAD_AT = 'velora:cpi:loadStartedAt'
const LS_VIEWED = 'velora:cpi:certViewed'
const LS_PRELEVA_PULSE = 'velora:cpi:prelevaPulse'

const LEGACY_POST_LOAD = new Set([
  'activating',
  'consult',
  'confirm_view',
  'verify',
  'pay_confirm',
  'ready',
  'viewed',
])

export interface CpiBuildApi {
  step: Ref<CpiStep>
  loadProgress: Ref<number>
  loadPct: ComputedRef<number>
  loadRemainLabel: ComputedRef<string>
  loadMs: ComputedRef<number>
  certViewed: Ref<boolean>
  /** После просмотра CPI — усиленный пульс Preleva, пока не нажали. */
  prelevaPulse: Ref<boolean>
  markCertViewed: () => void
  clearPrelevaPulse: () => void
  resetIfNotPolicyBuild: () => void
  restartGeneration: () => void
}

function formatRemain(progress: number, totalMs: number): string {
  const left = Math.max(0, Math.round((1 - progress) * totalMs))
  const m = Math.floor(left / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

function normalizeStep(raw: unknown, certViewed: boolean): CpiStep {
  const s = String(raw ?? 'loading')
  if (s === 'loading') return 'loading'
  if (s === 'viewed' || certViewed) return 'viewed'
  if (LEGACY_POST_LOAD.has(s)) return 'ready'
  return 'loading'
}

function createCpiBuild(): CpiBuildApi {
  const dossierStore = useDossierStore()
  const { dossier } = storeToRefs(dossierStore)

  const stepRaw = useLocalStorage<string>(LS_STEP, 'loading')
  const loadStartedAt = useLocalStorage<number>(LS_LOAD_AT, 0)
  const certViewed = useLocalStorage<boolean>(LS_VIEWED, false)
  const prelevaPulse = useLocalStorage<boolean>(LS_PRELEVA_PULSE, false)

  const step = ref<CpiStep>(normalizeStep(stepRaw.value, certViewed.value))
  watch(step, (s) => {
    stepRaw.value = s
  })

  /* Миграция старых ключей localStorage. */
  if (step.value !== stepRaw.value) stepRaw.value = step.value
  if (certViewed.value && step.value !== 'viewed') step.value = 'viewed'

  const loadProgress = ref(0)
  const loadMs = computed(() => (wantsFastAnim() ? FAST_LOAD_MS : CPI_LOAD_MS))
  const loadPct = computed(() => Math.round(loadProgress.value * 100))
  const loadRemainLabel = computed(() => formatRemain(loadProgress.value, loadMs.value))

  const phase = computed(() => dossier.value.commission.phase)

  function ensureLoadStart(): void {
    if (loadStartedAt.value && loadStartedAt.value > 0) return
    /*
     * Кросс-сессия: localStorage пуст (relogin / новое устройство), но сервер
     * уже знает прогресс генерации (policy_build_started_at → policyProgress).
     * Восстанавливаем виртуальный старт, чтобы не крутить 5 минут заново.
     */
    const serverProgress = Number(dossier.value.commission.policyProgress ?? 0)
    if (serverProgress >= 0.98) {
      /* Генерация уже завершилась на сервере — сразу «сертификат готов». */
      loadStartedAt.value = Date.now() - loadMs.value
      return
    }
    if (serverProgress > 0.05) {
      const elapsed = Math.round((serverProgress / 0.98) * loadMs.value)
      loadStartedAt.value = Date.now() - Math.min(elapsed, loadMs.value)
      return
    }
    loadStartedAt.value = Date.now()
  }

  function tickLoad(): void {
    if (phase.value !== 'policy_build') return
    if (step.value !== 'loading') return
    ensureLoadStart()
    const ratio = Math.min(1, (Date.now() - loadStartedAt.value) / loadMs.value)
    loadProgress.value = ratio
    dossier.value.commission.policyProgress = Math.min(0.98, Math.max(0.05, ratio * 0.98))
    if (ratio >= 1) {
      step.value = 'ready'
      loadProgress.value = 1
      dossier.value.commission.policyProgress = 1
      dossier.value.policy.status = 'issued'
      dossier.value.policy.etaMinutes = 0
    }
  }

  const { pause: pauseLoad, resume: resumeLoad } = useIntervalFn(tickLoad, 250, {
    immediate: false,
  })

  function syncTimersForStep(): void {
    pauseLoad()
    if (phase.value !== 'policy_build') return

    if (step.value === 'loading') {
      ensureLoadStart()
      tickLoad()
      resumeLoad()
      return
    }

    /* ready / viewed — генерация 100% */
    loadProgress.value = 1
    dossier.value.commission.policyProgress = Math.max(
      dossier.value.commission.policyProgress,
      1,
    )
  }

  watch(
    [step, phase],
    () => {
      syncTimersForStep()
    },
    { immediate: true },
  )

  function resetIfNotPolicyBuild(): void {
    if (phase.value === 'policy_build') return
    /*
     * Уход из policy_build (Preleva / pay_fee / L4 animating / failed…) —
     * НЕ сбрасываем CPI. Сертификат остаётся в Documenti на L3+ / L4+.
     * Полный сброс только через restartGeneration() (снова L3).
     */
    pauseLoad()
    if (step.value === 'loading' && (certViewed.value || dossier.value.policy.status === 'issued')) {
      step.value = 'viewed'
      loadProgress.value = 1
    }
  }

  watch(phase, (p, prev) => {
    if (p === 'policy_build' && prev !== 'policy_build') {
      if (!loadStartedAt.value && !certViewed.value) {
        step.value = 'loading'
        loadStartedAt.value = Date.now()
        loadProgress.value = 0
      }
      syncTimersForStep()
      return
    }
    if (p !== 'policy_build') {
      resetIfNotPolicyBuild()
    }
  })

  /**
   * Пользователь открыл и закрыл сертификат.
   * → phase ready (Preleva), Home, усиленный пульс вывода.
   */
  function markCertViewed(): void {
    if (step.value === 'loading') return
    step.value = 'viewed'
    certViewed.value = true
    prelevaPulse.value = true
    loadProgress.value = 1
    dossier.value.commission.policyProgress = 1
    dossier.value.policy.status = 'issued'
    dossier.value.policy.etaMinutes = 0
    /* Всегда ready после галочки — иначе Preleva «горит» но onWithdraw молчит. */
    if (
      dossier.value.commission.phase === 'policy_build' ||
      dossier.value.commission.phase === 'ready'
    ) {
      dossier.value.commission.phase = 'ready'
    } else if (dossier.value.commission.level === 3) {
      dossier.value.commission.phase = 'ready'
    }
  }

  function clearPrelevaPulse(): void {
    prelevaPulse.value = false
  }

  function restartGeneration(): void {
    step.value = 'loading'
    loadStartedAt.value = Date.now()
    loadProgress.value = 0
    certViewed.value = false
    prelevaPulse.value = false
    dossier.value.commission.policyProgress = 0.05
    dossier.value.policy.status = 'processing'
    dossier.value.policy.etaMinutes = 15
    if (dossier.value.commission.phase !== 'policy_build') {
      dossier.value.commission.phase = 'policy_build'
    }
    syncTimersForStep()
  }

  return {
    step,
    loadProgress,
    loadPct,
    loadRemainLabel,
    loadMs,
    certViewed,
    prelevaPulse,
    markCertViewed,
    clearPrelevaPulse,
    resetIfNotPolicyBuild,
    restartGeneration,
  }
}

export const useCpiBuild = createSharedComposable(createCpiBuild)
