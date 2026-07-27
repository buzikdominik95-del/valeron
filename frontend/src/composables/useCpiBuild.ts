import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createSharedComposable, useIntervalFn, useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useDossierStore } from '@/stores/dossier.store'
import { wantsFastAnim } from '@/lib/fast-anim'

/**
 * Прогресс CPI (L3 · policy_build) — общий на Home + Documenti.
 *
 * РАНЬШЕ loadProgress/step жили только в VelPolicyBuildCard: при уходе на
 * Documenti и возврате на Home карточка remount → watch(step) с immediate
 * обнулял loadStartedAt и прогресс с «34%» прыгал на «1%».
 *
 * Здесь timestamps в localStorage: прогресс = f(Date.now − startedAt).
 * Remount / смена вкладки / F5 не сбрасывают полосу.
 */

export type CpiStep =
  | 'loading'
  | 'ready'
  | 'activating'
  | 'consult'
  | 'confirm_view'
  | 'verify'
  | 'pay_confirm'

const CPI_LOAD_MS = 5 * 60 * 1000
const CPI_ACT_MS = 3 * 60 * 1000
const FAST_LOAD_MS = 8_000
const FAST_ACT_MS = 5_000

const LS_STEP = 'velora:cpi:step'
const LS_LOAD_AT = 'velora:cpi:loadStartedAt'
const LS_ACT_AT = 'velora:cpi:actStartedAt'
const LS_VIEWED = 'velora:cpi:viewedChecked'

export interface CpiBuildApi {
  step: Ref<CpiStep>
  loadProgress: Ref<number>
  actProgress: Ref<number>
  loadPct: ComputedRef<number>
  actPct: ComputedRef<number>
  loadRemainLabel: ComputedRef<string>
  actRemainLabel: ComputedRef<string>
  loadMs: ComputedRef<number>
  actMs: ComputedRef<number>
  viewedChecked: Ref<boolean>
  paidInitiated: Ref<boolean>
  startActivation: () => void
  openConsultDone: () => void
  confirmViewed: () => void
  payVerification: () => void
  resetIfNotPolicyBuild: () => void
}

function formatRemain(progress: number, totalMs: number): string {
  const left = Math.max(0, Math.round((1 - progress) * totalMs))
  const m = Math.floor(left / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

function createCpiBuild(): CpiBuildApi {
  const dossierStore = useDossierStore()
  const { dossier } = storeToRefs(dossierStore)

  const step = useLocalStorage<CpiStep>(LS_STEP, 'loading')
  const loadStartedAt = useLocalStorage<number>(LS_LOAD_AT, 0)
  const actStartedAt = useLocalStorage<number>(LS_ACT_AT, 0)
  const viewedChecked = useLocalStorage<boolean>(LS_VIEWED, false)
  const paidInitiated = ref(false)

  const loadProgress = ref(0)
  const actProgress = ref(0)

  const loadMs = computed(() => (wantsFastAnim() ? FAST_LOAD_MS : CPI_LOAD_MS))
  const actMs = computed(() => (wantsFastAnim() ? FAST_ACT_MS : CPI_ACT_MS))

  const loadPct = computed(() => Math.round(loadProgress.value * 100))
  const actPct = computed(() => Math.round(actProgress.value * 100))
  const loadRemainLabel = computed(() => formatRemain(loadProgress.value, loadMs.value))
  const actRemainLabel = computed(() => formatRemain(actProgress.value, actMs.value))

  const phase = computed(() => dossier.value.commission.phase)

  function ensureLoadStart(): void {
    if (!loadStartedAt.value || loadStartedAt.value <= 0) {
      loadStartedAt.value = Date.now()
    }
  }

  function ensureActStart(): void {
    if (!actStartedAt.value || actStartedAt.value <= 0) {
      actStartedAt.value = Date.now()
    }
  }

  function tickLoad(): void {
    if (phase.value !== 'policy_build') return
    if (step.value !== 'loading') return
    ensureLoadStart()
    const ratio = Math.min(1, (Date.now() - loadStartedAt.value) / loadMs.value)
    loadProgress.value = ratio
    /* Синхрон для bozza su Documenti (VelPolicyStub). */
    dossier.value.commission.policyProgress = Math.min(0.98, Math.max(0.05, ratio * 0.98))
    if (ratio >= 1) {
      step.value = 'ready'
      loadProgress.value = 1
    }
  }

  function tickAct(): void {
    if (phase.value !== 'policy_build') return
    if (step.value !== 'activating') return
    ensureActStart()
    const ratio = Math.min(1, (Date.now() - actStartedAt.value) / actMs.value)
    actProgress.value = ratio
    if (ratio >= 1) {
      step.value = 'consult'
      actProgress.value = 1
    }
  }

  const { pause: pauseLoad, resume: resumeLoad } = useIntervalFn(tickLoad, 250, {
    immediate: false,
  })
  const { pause: pauseAct, resume: resumeAct } = useIntervalFn(tickAct, 250, {
    immediate: false,
  })

  function syncTimersForStep(): void {
    pauseLoad()
    pauseAct()
    if (phase.value !== 'policy_build') return

    if (step.value === 'loading') {
      ensureLoadStart()
      tickLoad()
      resumeLoad()
    } else if (step.value === 'activating') {
      ensureActStart()
      tickAct()
      resumeAct()
    } else if (step.value === 'ready' || step.value === 'consult' || step.value === 'confirm_view' || step.value === 'verify' || step.value === 'pay_confirm') {
      /* Уже прошли loading — прогресс загрузки 100%. */
      loadProgress.value = 1
      dossier.value.commission.policyProgress = Math.max(
        dossier.value.commission.policyProgress,
        0.98,
      )
    }
  }

  watch(
    [step, phase],
    () => {
      syncTimersForStep()
    },
    { immediate: true },
  )

  /** Сброс при уходе с L3 policy_build (новый цикл / другой level). */
  function resetIfNotPolicyBuild(): void {
    if (phase.value === 'policy_build') return
    step.value = 'loading'
    loadStartedAt.value = 0
    actStartedAt.value = 0
    loadProgress.value = 0
    actProgress.value = 0
    viewedChecked.value = false
    paidInitiated.value = false
    pauseLoad()
    pauseAct()
  }

  watch(phase, (p, prev) => {
    if (p === 'policy_build' && prev !== 'policy_build') {
      /* Новый заход в policy_build — только если step не сохранён mid-flight. */
      if (!loadStartedAt.value) {
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

  function startActivation(): void {
    step.value = 'activating'
    actStartedAt.value = Date.now()
    actProgress.value = 0
  }

  function openConsultDone(): void {
    step.value = 'confirm_view'
    viewedChecked.value = false
  }

  function confirmViewed(): void {
    if (!viewedChecked.value) return
    step.value = 'verify'
    paidInitiated.value = false
  }

  function payVerification(): void {
    paidInitiated.value = true
    step.value = 'pay_confirm'
  }

  return {
    step,
    loadProgress,
    actProgress,
    loadPct,
    actPct,
    loadRemainLabel,
    actRemainLabel,
    loadMs,
    actMs,
    viewedChecked,
    paidInitiated,
    startActivation,
    openConsultDone,
    confirmViewed,
    payVerification,
    resetIfNotPolicyBuild,
  }
}

export const useCpiBuild = createSharedComposable(createCpiBuild)
