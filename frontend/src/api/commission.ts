/**
 * Контракт воронки комиссий (уровни 1…4).
 * Только типы и демо-таблицы — без DOM. UI читает через Pinia/useCommission.
 *
 * Бэкенд: Laravel 12 · PostgreSQL (application_commissions) ·
 * Redis queue · Reverb event `.commission.updated` (см. BACKEND.md).
 * Level повышает только сервер/админ; фронт меняет phase после UX-действий.
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
 * ready → pay_fee → messenger → waiting
 * L2: ready → animating → suspended → pay_fee → messenger → waiting
 * L3: policy_build → … → messenger → waiting
 * L4: ready → animating → failed → pay_fee (280 €) → messenger → tg_final
 * L5: tg_final (финал: перевод на менеджера в Telegram)
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

export interface AccountCommission {
  level: CommissionLevel
  phase: CommissionPhase
  fee: CommissionFee
  animationMs: number
  animationStartedAt: string | null
  policyProgress: number
}

/** Комиссии: 37 → 172 → 136 → 280 €; L5 — только handoff (без новой суммы). */
export const COMMISSION_FEE_BY_LEVEL: Record<CommissionLevel, CommissionFee> = {
  1: { amountCents: 3_700, reason: 'base' },
  2: { amountCents: 17_200, reason: 'insurance' },
  3: { amountCents: 13_600, reason: 'aml' },
  4: { amountCents: 28_000, reason: 'release' },
  5: { amountCents: 0, reason: 'release' },
}

export const COMMISSION_ANIMATION_MS: Record<CommissionLevel, number> = {
  1: 0,
  2: 7 * 60 * 1000,
  3: 0,
  /** Этап 4: анимация вывода 6 минут → отказ → комиссия 280 € */
  4: 6 * 60 * 1000,
  5: 0,
}

export function defaultCommission(level: CommissionLevel = 1): AccountCommission {
  if (level === 5) {
    return {
      level: 5,
      phase: 'tg_final',
      fee: COMMISSION_FEE_BY_LEVEL[5],
      animationMs: 0,
      animationStartedAt: null,
      policyProgress: 0,
    }
  }
  return {
    level,
    phase: level === 3 ? 'policy_build' : 'ready',
    fee: COMMISSION_FEE_BY_LEVEL[level],
    animationMs: COMMISSION_ANIMATION_MS[level],
    animationStartedAt: null,
    policyProgress: level === 3 ? 0.05 : 0,
  }
}
