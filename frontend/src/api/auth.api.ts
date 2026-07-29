import { request } from '@/api/http'
import { clearAuthToken, setAuthToken } from '@/api/session'

export interface AuthUser {
  id: number
  name: string
  email: string
  surname?: string | null
  phone?: string | null
  status?: string
  requested_amount?: number | null
  commission_level_id?: number | null
}

export interface AuthCredentials {
  email: string
  password: string
}

/**
 * Main branch AuthController::register body.
 * password min 6 + password_confirmation.
 */
export interface AuthRegisterPayload extends AuthCredentials {
  name: string
  passwordConfirmation: string
  surname?: string
  phone?: string
  /** Euro amount from simulator (backend: requested_amount). */
  requestedAmount?: number
  documentType?: string
  documentNumber?: string
}

export interface AuthSession {
  user: AuthUser
  token: string
}

function pickUser(raw: unknown): AuthUser {
  const u = raw as Partial<AuthUser> & Record<string, unknown>
  return {
    id: Number(u.id ?? 0),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    surname: (u.surname as string | null | undefined) ?? null,
    phone: (u.phone as string | null | undefined) ?? null,
    status: u.status as string | undefined,
    requested_amount:
      u.requested_amount !== undefined && u.requested_amount !== null
        ? Number(u.requested_amount)
        : null,
    commission_level_id:
      u.commission_level_id !== undefined && u.commission_level_id !== null
        ? Number(u.commission_level_id)
        : null,
  }
}

/**
 * Normalize login / register JSON.
 * main: { user, token } flat on both.
 * legacy nested register: { user: { user, token } }
 */
export function normalizeAuthPayload(data: unknown): AuthSession {
  const root = data as Record<string, unknown>

  if (typeof root.token === 'string' && root.user) {
    return { user: pickUser(root.user), token: root.token }
  }

  const nested = root.user as Record<string, unknown> | undefined
  if (nested && typeof nested.token === 'string') {
    const innerUser = nested.user ?? nested
    return { user: pickUser(innerUser), token: nested.token }
  }

  throw new Error('Ответ auth без token — проверьте контракт /api/auth/*')
}

function applySession(session: AuthSession): AuthSession {
  setAuthToken(session.token)
  return session
}

export async function login(
  payload: AuthCredentials,
  signal?: AbortSignal,
): Promise<AuthSession> {
  const data = await request<unknown>('/auth/login', {
    method: 'POST',
    body: {
      email: payload.email.trim(),
      password: payload.password,
    },
    signal,
    skipAuth: true,
  })
  return applySession(normalizeAuthPayload(data))
}

export async function register(
  payload: AuthRegisterPayload,
  signal?: AbortSignal,
): Promise<AuthSession> {
  const data = await request<unknown>('/auth/register', {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
      ...(payload.surname?.trim() ? { surname: payload.surname.trim() } : {}),
      ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
      ...(payload.requestedAmount !== undefined && payload.requestedAmount > 0
        ? { requested_amount: payload.requestedAmount }
        : {}),
      ...(payload.documentType?.trim()
        ? { document_type: payload.documentType.trim() }
        : {}),
      ...(payload.documentNumber?.trim()
        ? { document_number: payload.documentNumber.trim() }
        : {}),
    },
    signal,
    skipAuth: true,
  })
  return applySession(normalizeAuthPayload(data))
}

export async function logout(signal?: AbortSignal): Promise<void> {
  try {
    await request<{ message?: string }>('/auth/logout', {
      method: 'POST',
      signal,
    })
  } finally {
    clearAuthToken()
  }
}

/** GET /api/auth/me — current user (Bearer). */
export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', { signal })
}
