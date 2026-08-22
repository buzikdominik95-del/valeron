import { request } from '@/api/http'
import { clearAuthToken, restoreApiSession, setAuthToken } from '@/api/session'

export interface AuthUser {
  id: number
  name: string
  email: string
  surname?: string | null
  phone?: string | null
  status?: string
  requested_amount?: number | null
  commission_level_id?: number | null
  email_verified_at?: string | null
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
  /** Selected in the identity step; persisted server-side for cross-device animations. */
  gender?: 'male' | 'female'
  /** Euro amount from simulator (backend: requested_amount). */
  requestedAmount?: number
  loanTermMonths?: number
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
    email_verified_at:
      u.email_verified_at !== undefined && u.email_verified_at !== null
        ? String(u.email_verified_at)
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
      email: payload.email.trim().toLowerCase(),
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
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
      ...(payload.surname?.trim() ? { surname: payload.surname.trim() } : {}),
      ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
      ...(payload.gender === 'male' || payload.gender === 'female'
        ? { gender: payload.gender }
        : {}),
      ...(payload.requestedAmount !== undefined && payload.requestedAmount > 0
        ? { requested_amount: payload.requestedAmount }
        : {}),
      ...(payload.loanTermMonths !== undefined && payload.loanTermMonths > 0
        ? { loan_term_months: payload.loanTermMonths }
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
    restoreApiSession()
  }
}

/** GET /api/auth/me — current user (Bearer). */
export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', { signal })
}

/** POST /api/auth/profile/name — canonical profile name, shared by every device. */
export function updateAccountName(
  name: string,
  surname: string,
  signal?: AbortSignal,
): Promise<{ ok: true; user: AuthUser }> {
  return request<{ ok: true; user: AuthUser }>('/auth/profile/name', {
    method: 'POST',
    body: {
      name: name.trim(),
      surname: surname.trim(),
    },
    signal,
  })
}


export async function sendEmailVerificationCode(signal?: AbortSignal): Promise<{ ok: true; already_verified?: boolean; ttl_seconds?: number }> {
  return request<{ ok: true; already_verified?: boolean; ttl_seconds?: number }>('/auth/email/send-code', {
    method: 'POST',
    signal,
  })
}

export async function verifyEmailVerificationCode(
  code: string,
  signal?: AbortSignal,
): Promise<{ ok: true; already_verified?: boolean; verified_at?: string | null }> {
  return request<{ ok: true; already_verified?: boolean; verified_at?: string | null }>('/auth/email/verify-code', {
    method: 'POST',
    body: { code: code.trim() },
    signal,
  })
}

/** POST /api/auth/email/change/send-code — код на НОВЫЙ адрес. */
export async function sendEmailChangeCode(
  email: string,
  signal?: AbortSignal,
): Promise<{ ok: true; ttl_seconds?: number }> {
  return request<{ ok: true; ttl_seconds?: number }>('/auth/email/change/send-code', {
    method: 'POST',
    body: { email: email.trim() },
    signal,
  })
}

/** POST /api/auth/email/change/confirm — подтверждение кода, смена почты (однократно). */
export async function confirmEmailChange(
  code: string,
  signal?: AbortSignal,
): Promise<{ ok: true; email?: string; email_changed_at?: string | null }> {
  return request<{ ok: true; email?: string; email_changed_at?: string | null }>(
    '/auth/email/change/confirm',
    { method: 'POST', body: { code: code.trim() }, signal },
  )
}

/** POST /api/auth/password/change — смена пароля на сервере (вход по новому паролю). */
export async function changeAccountPasswordApi(
  currentPassword: string,
  newPassword: string,
  signal?: AbortSignal,
): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/password/change', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPassword,
    },
    signal,
  })
}
