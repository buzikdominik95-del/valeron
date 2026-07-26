import { request } from '@/api/http'
import type { CreditPurpose } from '@/types/velora'

/**
 * Контракт расчёта кредита. Пока бэкенда нет, этот модуль не вызывается
 * из интерфейса — он описывает, что именно фронт ждёт от Laravel,
 * чтобы подключение свелось к одной строке в useCreditSimulator.
 *
 * POST /api/simulations
 *   body: { purpose, amount }
 *   200:  SimulationResult
 *   422:  { message, errors: { amount: [...], purpose: [...] } }
 */

export interface SimulationRequest {
  purpose: CreditPurpose
  amount: number
}

export interface SimulationResult {
  /** Идентификатор заявки, по нему же подписываемся на канал Reverb. */
  id: string
  amount: number
  purpose: CreditPurpose
  /** Годовая ставка в процентах, например 3.8 */
  rate: number
  /** Срок в месяцах, который подобрал бэкенд. */
  termMonths: number
  /** Ежемесячный платёж в евроцентах — целое, чтобы не ловить ошибки float. */
  monthlyPaymentCents: number
  /** Полная стоимость в евроцентах. */
  totalCents: number
}

export function createSimulation(
  payload: SimulationRequest,
  signal?: AbortSignal,
): Promise<SimulationResult> {
  return request<SimulationResult>('/simulations', {
    method: 'POST',
    body: payload,
    signal,
  })
}
