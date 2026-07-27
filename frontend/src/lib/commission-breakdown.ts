/**
 * Разбивка суммы комиссии — 1:1 с Calipso `cabinet.html` → `_updateCommBreakdown`.
 *
 *   iva  = total × 22/122
 *   net  = total − iva
 *   sign = net × 0.40   (Firma digitale)
 *   serv = net − sign   (Servizi selezione / Consulenza legale)
 *
 * Подписи строк меняются по уровню (applyLevel2UI на проде).
 */

import type { CommissionFeeReason } from '@/api/commission'

export interface CommissionBreakdownLine {
  /** i18n key suffix under account.commission.fee.lines.* */
  key: 'tax' | 'service' | 'sign'
  amountEuros: number
}

export interface CommissionBreakdown {
  totalEuros: number
  lines: readonly CommissionBreakdownLine[]
  /** L3 на проде прятал breakdown — у нас показываем всегда (запрос). */
  visible: boolean
}

/** Та же формула, что window._updateCommBreakdown(total). */
export function splitCommissionAmount(totalEuros: number): {
  tax: number
  service: number
  sign: number
} {
  const t = Number.isFinite(totalEuros) ? Math.max(0, totalEuros) : 0
  const tax = +(t * (22 / 122)).toFixed(2)
  const net = +(t - tax).toFixed(2)
  const sign = +(net * 0.4).toFixed(2)
  const service = +(net - sign).toFixed(2)
  return { tax, service, sign }
}

/**
 * Строки breakdown + какой набор подписей (base / insurance / aml|release).
 * L2: Imposta assicurativa + Consulenza legale + Firma digitale
 * L1/L3/L4: IVA 22% + Servizi selezione + Firma digitale
 */
export function commissionBreakdown(
  totalEuros: number,
  _reason: CommissionFeeReason,
): CommissionBreakdown {
  const { tax, service, sign } = splitCommissionAmount(totalEuros)
  /* reason влияет на подписи (breakdownLabelSet), не на цифры. */
  void _reason
  return {
    totalEuros,
    visible: true,
    lines: [
      { key: 'tax', amountEuros: tax },
      { key: 'service', amountEuros: service },
      { key: 'sign', amountEuros: sign },
    ],
  }
}

/** Какой набор подписей: L2 (insurance) vs остальные. */
export function breakdownLabelSet(
  reason: CommissionFeeReason,
): 'insurance' | 'default' {
  return reason === 'insurance' ? 'insurance' : 'default'
}
