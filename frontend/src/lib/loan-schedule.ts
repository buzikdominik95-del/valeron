/**
 * График погашения (TAN фиксированный, аннуитет).
 * Только фронт-демо; банк пришлёт свой schedule с API.
 */

export interface LoanScheduleRow {
  /** 1-based */
  index: number
  /** ISO date YYYY-MM-DD */
  date: string
  /** евроценты */
  paymentCents: number
  principalCents: number
  interestCents: number
  residualCents: number
}

export interface LoanPlan {
  monthlyPaymentCents: number
  totalInterestCents: number
  totalPaidCents: number
  rows: LoanScheduleRow[]
}

/** Месячный аннуитет в центах (округление half-up). */
export function monthlyAnnuityCents(
  principalCents: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0 || principalCents <= 0) return 0
  const r = annualRatePercent / 100 / 12
  if (r === 0) return Math.round(principalCents / months)
  const factor = (r * (1 + r) ** months) / ((1 + r) ** months - 1)
  return Math.round(principalCents * factor)
}

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * @param principalCents одобренная сумма
 * @param annualRatePercent TAN, напр. 3.8
 * @param months срок
 * @param firstPaymentDate ISO первой даты платежа
 */
export function buildLoanPlan(
  principalCents: number,
  annualRatePercent: number,
  months: number,
  firstPaymentDate: string,
): LoanPlan {
  const payment = monthlyAnnuityCents(principalCents, annualRatePercent, months)
  const r = annualRatePercent / 100 / 12
  let residual = principalCents
  const rows: LoanScheduleRow[] = []
  let totalInterest = 0

  for (let i = 1; i <= months; i++) {
    const interest = Math.round(residual * r)
    let principal = payment - interest
    if (i === months || principal > residual) {
      principal = residual
    }
    residual = Math.max(0, residual - principal)
    totalInterest += interest
    const rowPayment = principal + interest
    rows.push({
      index: i,
      date: addMonths(firstPaymentDate, i - 1),
      paymentCents: rowPayment,
      principalCents: principal,
      interestCents: interest,
      residualCents: residual,
    })
  }

  return {
    monthlyPaymentCents: payment,
    totalInterestCents: totalInterest,
    totalPaidCents: principalCents + totalInterest,
    rows,
  }
}
