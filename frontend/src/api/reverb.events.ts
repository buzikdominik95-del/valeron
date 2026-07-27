/**
 * Payload событий Laravel Reverb.
 * Имена broadcastAs — с точкой (private channel client: .commission.updated).
 *
 * Бэкенд: ShouldBroadcast, Redis queue, канал private-application.{id}.
 * Формы совпадают с REST (camelCase), чтобы hydrate() ел и HTTP, и WS.
 */

import type { AccountCommission } from '@/api/commission'
import type {
  AccountDossier,
  AccountPolicy,
  AccountTransfer,
} from '@/api/account.api'
import type { BankRow } from '@/composables/useBankAnalysis'

/** private-application.{applicationId} */
export const REVERB_EVENTS = {
  bankStatus: '.bank.status',
  accountUpdated: '.account.updated',
  commissionUpdated: '.commission.updated',
  transferUpdated: '.transfer.updated',
  policyUpdated: '.policy.updated',
  messageReceived: '.message.received',
} as const

export type ReverbEventName = (typeof REVERB_EVENTS)[keyof typeof REVERB_EVENTS]

export type BankStatusEvent = BankRow

export type AccountUpdatedEvent = AccountDossier

export type CommissionUpdatedEvent = AccountCommission

export type TransferUpdatedEvent = AccountTransfer

export type PolicyUpdatedEvent = AccountPolicy

export interface MessageReceivedEvent {
  id: string
  body: string
  /** ISO-8601 */
  at: string
}
