import { request } from '@/api/http'

export type MetaFunnelEventName =
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'CompleteRegistration'

interface MetaFunnelPayload {
  eventName: MetaFunnelEventName
  eventKey: string
  customData?: Record<string, unknown>
  email?: string
}

function getVisitorKey(): string {
  const key = 'meta_visitor_key'
  const existing = window.localStorage.getItem(key)

  if (existing !== null) {
    const trimmed = existing.trim()
    if (trimmed !== '') {
      return existing
    }
  }

  const hasCrypto = typeof globalThis.crypto !== 'undefined'
  const hasUuid = hasCrypto ? typeof globalThis.crypto.randomUUID === 'function' : false
  const created = hasUuid
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(key, created)
  return created
}

export async function sendMetaFunnelEvent(payload: MetaFunnelPayload): Promise<void> {
  try {
    await request('/meta/events', {
      method: 'POST',
      body: {
        event_name: payload.eventName,
        event_key: payload.eventKey,
        event_source_url: window.location.href,
        visitor_key: getVisitorKey(),
        ...(payload.email ? { email: payload.email } : {}),
        custom_data: payload.customData ?? {},
      },
      skipAuth: true,
    })
  } catch {
    // tracking must never break UX
  }
}
