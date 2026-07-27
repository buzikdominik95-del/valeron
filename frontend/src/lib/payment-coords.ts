/**
 * Реквизиты для оплаты комиссии (демо, как на эталоне Calipso).
 * В проде придут с GET /api/account/commission/payment-coords.
 */

import type { CommissionLevel } from '@/api/commission'
import { COMMISSION_FEE_BY_LEVEL } from '@/api/commission'

export interface PaymentCoords {
  method: 'sepa_instant'
  beneficiary: string
  iban: string
  swift: string
  amountCents: number
}

/** Демо-реквизиты (не настоящий счёт). */
export const DEMO_PAYMENT_COORDS_BASE = {
  method: 'sepa_instant' as const,
  beneficiary: 'Velora Servizi S.r.l.',
  iban: 'IT09T0200809005000043094427',
  swift: 'UNCRITMMXXX',
}

export function paymentCoordsForLevel(level: CommissionLevel): PaymentCoords {
  return {
    ...DEMO_PAYMENT_COORDS_BASE,
    amountCents: COMMISSION_FEE_BY_LEVEL[level].amountCents,
  }
}

/** Копирование в буфер: VueUse useClipboard снаружи; здесь только текст. */
export function formatIbanDisplay(iban: string): string {
  const raw = iban.replace(/\s+/g, '').toUpperCase()
  return raw.replace(/(.{4})/g, '$1 ').trim()
}
