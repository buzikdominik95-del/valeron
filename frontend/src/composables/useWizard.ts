import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useViewParams } from '@/composables/useViewParams'
import { useSimulatorStore } from '@/stores/simulator.store'

/** Порядок шагов задаёт и направление next/back, и номер шага в интерфейсе. */
export const WIZARD_STEPS = [
  'purpose',
  'amount',
  'duration',
  'identity',
  'analysis',
  'finalizing',
  'result',
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]

/** Страж для значения из адресной строки: туда руками вписывают что угодно. */
export function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === 'string' && (WIZARD_STEPS as readonly string[]).includes(value)
}

/**
 * Заполнение полосы намеренно неравномерное: последние шаги короткие и почти
 * автоматические, поэтому полоса уходит к концу быстрее, чем растёт номер шага.
 */
const STEP_PROGRESS: Record<WizardStep, number> = {
  purpose: 20,
  amount: 40,
  duration: 60,
  identity: 80,
  analysis: 95,
  /* Между опросом банков и результатом полоса почти не двигается: работа уже
     сделана, осталось оформление. Два процента и есть эта пауза — на 100 %
     полоса встанет только вместе с готовым предложением. */
  finalizing: 97,
  result: 100,
}

export interface WizardApi {
  step: Ref<WizardStep>
  stepIndex: ComputedRef<number>
  progress: ComputedRef<number>
  isOpen: ComputedRef<boolean>
  canGoBack: ComputedRef<boolean>
  open(from?: WizardStep): void
  next(): void
  back(): void
  close(): void
}

function createWizard(): WizardApi {
  /*
   * Шаг живёт в ?step=... : переживает перезагрузку и копируется ссылкой.
   *
   * Параметры адресной строки берутся общим экземпляром (useViewParams), а не
   * своим: в строке живёт ещё и кабинет (?view=account), а каждый экземпляр
   * useUrlSearchParams собирает запрос заново только из того, что знает сам, —
   * своя копия выкидывала бы чужой параметр. Там же объяснено, почему
   * writeMode остался 'replace'.
   */
  const params = useViewParams()

  // Чиним состояние один раз при инициализации, а не только на чтение: иначе
  // мусорный ?step=zzz остаётся в ссылке, которой пользователь потом делится.
  if (params.step !== undefined && !isWizardStep(params.step)) {
    delete params.step
  }

  const step = computed<WizardStep>({
    get: () => (isWizardStep(params.step) ? params.step : WIZARD_STEPS[0]),
    set: (value) => {
      params.step = value
    },
  })

  const isOpen = computed(() => isWizardStep(params.step))
  const stepIndex = computed(() => Math.max(0, WIZARD_STEPS.indexOf(step.value)))
  const progress = computed(() => STEP_PROGRESS[step.value])
  const canGoBack = computed(() => isOpen.value && stepIndex.value > 0)

  /** Сдвиг по списку с упором в края: за границы мастер не выходит. */
  function go(offset: number): void {
    const target = WIZARD_STEPS[stepIndex.value + offset]
    if (target === undefined) return
    step.value = target
  }

  /**
   * Перед входом в мастер дублируем текущую запись истории. Переходы между
   * шагами идут через replaceState, и без этого дубля запись о лендинге
   * затиралась бы первым же шагом — системная кнопка «назад» уводила бы
   * пользователя с сайта вместо возврата на главную.
   *
   * Шаг входа задаётся аргументом: калькулятор на лендинге уже спросил цель,
   * и переспрашивать её на первом шаге мастера было бы издевательством.
   */
  function open(from: WizardStep = WIZARD_STEPS[0]): void {
    window.history.pushState({}, '', window.location.href)
    /* Новый заход: не подставлять старые Cognome/Nome/doc из localStorage */
    useSimulatorStore().clearIdentityCache()
    step.value = from
  }

  function next(): void {
    go(1)
  }

  function back(): void {
    if (!canGoBack.value) return
    go(-1)
  }

  function close(): void {
    delete params.step
  }

  return { step, stepIndex, progress, isOpen, canGoBack, open, next, back, close }
}

/**
 * Состояние общее на всё приложение. Свой useUrlSearchParams на каждый вызов
 * означал бы несколько независимых копий параметров: они не видят записи друг
 * друга (replaceState не поднимает popstate) и затирали бы чужой шаг.
 */
const useSharedWizard = createSharedComposable(createWizard)

export function useWizard(): WizardApi {
  return useSharedWizard()
}
