import { computed, watch } from 'vue'
import type { WritableComputedRef } from 'vue'
import {
  AMOUNT_DEFAULT,
  AMOUNT_MAX,
  AMOUNT_MIN,
  AMOUNT_STEP,
  ANNUAL_RATE_PERCENT,
  TERM_DEFAULT,
  TERM_MAX,
  TERM_MIN,
  TERM_STEP,
  useSimulatorStore,
} from '@/stores/simulator.store'
import { isCreditPurpose } from '@/types/velora'
import type { CreditPurpose } from '@/types/velora'

/**
 * Поведение калькулятора: нормализация суммы, шаг, доля заполнения ползунка.
 * Компоненты берут отсюда готовые значения и ничего не считают сами.
 */
export function useCreditSimulator() {
  const store = useSimulatorStore()

  /**
   * Приводит любое значение к допустимой сумме.
   * localStorage правится руками и переживает смену версий, поэтому оттуда
   * может прийти NaN, строка, дробь или число не кратное шагу — и всё это
   * обязано превратиться в валидную сумму, а не развалить калькулятор.
   */
  function normalize(value: unknown): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return AMOUNT_DEFAULT

    const snapped = Math.round(parsed / AMOUNT_STEP) * AMOUNT_STEP
    return Math.min(AMOUNT_MAX, Math.max(AMOUNT_MIN, snapped))
  }

  // Чиним сохранённое состояние один раз при инициализации, а не только на чтение:
  // иначе в localStorage навсегда остаётся мусор, а ползунок, степпер и заливка
  // расходятся между собой.
  const restoredAmount = normalize(store.amount)
  if (restoredAmount !== store.amount) {
    store.amount = restoredAmount
  }

  if (store.purpose !== '' && !isCreditPurpose(store.purpose)) {
    store.purpose = ''
  }

  const amount: WritableComputedRef<number> = computed({
    get: () => normalize(store.amount),
    set: (value) => {
      store.amount = normalize(value)
    },
  })

  const purpose: WritableComputedRef<CreditPurpose | ''> = computed({
    get: () => (isCreditPurpose(store.purpose) ? store.purpose : ''),
    set: (value) => {
      store.purpose = isCreditPurpose(value) ? value : ''
    },
  })

  /** Доля заполнения 0…1 — уходит в CSS-переменную дорожки. */
  const progress = computed(() => (amount.value - AMOUNT_MIN) / (AMOUNT_MAX - AMOUNT_MIN))

  /** Та же нормализация, что и для суммы: мусор из localStorage не должен ломать шаг. */
  function normalizeTerm(value: unknown): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return TERM_DEFAULT

    const snapped = Math.round(parsed / TERM_STEP) * TERM_STEP
    return Math.min(TERM_MAX, Math.max(TERM_MIN, snapped))
  }

  const restoredTerm = normalizeTerm(store.termMonths)
  if (restoredTerm !== store.termMonths) {
    store.termMonths = restoredTerm
  }

  const termMonths: WritableComputedRef<number> = computed({
    get: () => normalizeTerm(store.termMonths),
    set: (value) => {
      store.termMonths = normalizeTerm(value)
    },
  })

  const termProgress = computed(() => (termMonths.value - TERM_MIN) / (TERM_MAX - TERM_MIN))

  /**
   * Аннуитетный платёж: P × i / (1 − (1 + i)^−n), где i — месячная ставка.
   * Проверено по боевому мастеру: 12 400 € на 36 месяцев под 3,8% дают 365 €/мес,
   * ровно как показывает оригинальный сайт.
   */
  function annuityPayment(principal: number, annualRatePercent: number, months: number): number {
    if (months <= 0) return 0

    const monthlyRate = annualRatePercent / 100 / 12
    if (monthlyRate === 0) return principal / months

    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
  }

  const monthlyPayment = computed(() =>
    annuityPayment(amount.value, ANNUAL_RATE_PERCENT, termMonths.value),
  )

  const canDecrease = computed(() => amount.value > AMOUNT_MIN)
  const canIncrease = computed(() => amount.value < AMOUNT_MAX)

  function decrease(): void {
    amount.value = amount.value - AMOUNT_STEP
  }

  function increase(): void {
    amount.value = amount.value + AMOUNT_STEP
  }

  /** Цель обязательна: без неё считать нечего. */
  const canSubmit = computed(() => purpose.value !== '')
  const calculated = computed(() => store.calculated)

  function calculate(): boolean {
    if (!canSubmit.value) return false
    store.calculated = true
    return true
  }

  // Меняешь условия — прошлый расчёт больше не действителен.
  watch([amount, purpose], () => {
    store.calculated = false
  })

  return {
    amount,
    purpose,
    progress,
    canDecrease,
    canIncrease,
    canSubmit,
    calculated,
    decrease,
    increase,
    calculate,
    min: AMOUNT_MIN,
    max: AMOUNT_MAX,
    step: AMOUNT_STEP,

    termMonths,
    termProgress,
    monthlyPayment,
    termMin: TERM_MIN,
    termMax: TERM_MAX,
    termStep: TERM_STEP,
    ratePercent: ANNUAL_RATE_PERCENT,
  }
}
