/**
 * Контракт воронки комиссий (уровни 1…4).
 * Только типы и демо-таблицы — без DOM. UI читает через Pinia/useCommission.
 *
 * Бэкенд: Laravel 12 · PostgreSQL (application_commissions) ·
 * Redis queue · Reverb event `.commission.updated` (см. BACKEND.md).
 * Level повышает только сервер/админ; фронт меняет phase после UX-действий.
 *
 * L5 снят: финал Telegram = конец L4 после отказной анимации (phase tg_final),
 * без оплаты 280 €.
 */

export const COMMISSION_LEVELS = [1, 2, 3, 4, 5] as const
export type CommissionLevel = (typeof COMMISSION_LEVELS)[number]

export function isCommissionLevel(value: unknown): value is CommissionLevel {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (COMMISSION_LEVELS as readonly number[]).includes(value)
  )
}

/**
 * Нормализация уровня (в т.ч. legacy L5 из localStorage / старого API → L4).
 * Number(): JSON/localStorage иногда отдаёт "2"/"3" строкой — иначе isCommissionLevel
 * ложно и F5 сбрасывает на L1, пока hydrate не вернёт этап.
 */
export function normalizeCommissionLevel(value: unknown): CommissionLevel {
  const n = typeof value === 'number' ? value : Number(value)
  if (isCommissionLevel(n)) return n
  return 1
}

/**
 * ready → pay_fee → messenger → waiting
 * L2: ready → animating → suspended → pay_fee → messenger → waiting
 * L3: policy_build → … → messenger → waiting
 * L4: ready → animating → tg_final (отказ вывода → Telegram, без fee 280 €)
 */
export type CommissionPhase =
  | 'ready'
  | 'pay_fee'
  | 'messenger'
  | 'waiting'
  | 'animating'
  | 'suspended'
  | 'policy_build'
  | 'failed'
  | 'tg_final'

export type CommissionFeeReason = 'base' | 'insurance' | 'aml' | 'release'

export interface CommissionFee {
  amountCents: number
  reason: CommissionFeeReason
}

export interface CommissionContent {
  calloutTitle?: string
  calloutBody?: string
  helpModalTitle?: string
  helpModalBody?: string
}

export interface AccountCommission {
  level: CommissionLevel
  phase: CommissionPhase
  fee: CommissionFee
  content?: CommissionContent
  animationMs: number
  animationStartedAt: string | null
  policyProgress: number
}

/** Комиссии: 37 → 172 → 136 €; L4 — без оплаты (финал TG после анимации). */
export const COMMISSION_FEE_BY_LEVEL: Record<CommissionLevel, CommissionFee> = {
  1: { amountCents: 3_700, reason: 'base' },
  2: { amountCents: 17_200, reason: 'insurance' },
  3: { amountCents: 13_600, reason: 'aml' },
  4: { amountCents: 0, reason: 'release' },
  5: { amountCents: 0, reason: 'release' },
}

/**
 * Комиссии, которые увеличивают Saldo / тело Prestito / строки графика.
 * L1 (37 € base) — только «оплата доступа», к кредиту/счёту НЕ идёт.
 * L2 insurance + L3 AML — да. L4 — без fee (финал TG).
 */
export function commissionAddsToLoanBalance(level: number): boolean {
  return level === 2 || level === 3
}

/**
 * Таймер анимации вывода (стенные часы, не длительность canvas-loop):
 *  L2: 7 минут → авто-отказ (suspended) → оплата страховки → messenger → admin L3
 *  L4: 3 минуты → авто-отказ (tg_final)
 */
export const COMMISSION_ANIMATION_MS: Record<CommissionLevel, number> = {
  1: 0,
  2: 7 * 60 * 1000,
  3: 0,
  4: 3 * 60 * 1000,
  5: 3 * 60 * 1000,
}

export function defaultCommission(level: CommissionLevel = 1): AccountCommission {
  const lv = normalizeCommissionLevel(level)
  return {
    level: lv,
    phase: lv === 3 ? 'policy_build' : 'ready',
    fee: COMMISSION_FEE_BY_LEVEL[lv],
    animationMs: COMMISSION_ANIMATION_MS[lv],
    animationStartedAt: null,
    policyProgress: lv === 3 ? 0.05 : 0,
  }
}
