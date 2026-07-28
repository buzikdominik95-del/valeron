import { request } from '@/api/http'
import { isApiEnabled } from '@/api/account.api'

export interface CreditApprovalEmailPayload {
  email: string
  firstName: string
  lastName: string
  fullName: string
  /** Importo in euro (numero). */
  amountEuros: number
  /** Es. "8.300,00 €" — se assente il backend formatta. */
  amountFormatted: string
}

export interface CreditApprovalEmailResult {
  ok: boolean
  message: string
  to?: string
  /** true se non c’è API: solo anteprima locale. */
  offline?: boolean
}

/**
 * Invia al backend i dati per la mail «credito approvato».
 * Senza VITE_USE_API=1 risolve offline (preview/demo).
 */
export async function sendCreditApprovalEmail(
  payload: CreditApprovalEmailPayload,
  signal?: AbortSignal,
): Promise<CreditApprovalEmailResult> {
  if (!isApiEnabled()) {
    await new Promise((r) => window.setTimeout(r, 420))
    return {
      ok: true,
      message: 'Anteprima locale: API disattivata (VITE_USE_API)',
      to: payload.email,
      offline: true,
    }
  }

  return request<CreditApprovalEmailResult>('/account/emails/credit-approval', {
    method: 'POST',
    body: payload,
    signal,
  })
}
