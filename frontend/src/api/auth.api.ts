import { request } from '@/api/http'

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  surname?: string
  phone?: string
  requested_amount?: number
  document_type?: string
  document_number?: string
}

export function registerAccount(
  payload: RegisterPayload,
  signal?: AbortSignal,
): Promise<{ user: AuthUser; token: string }> {
  return request<{ user: AuthUser; token: string }>('/auth/register', {
    method: 'POST',
    body: payload,
    signal,
  })
}

export function loginAccount(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<{ user: AuthUser; token: string }> {
  return request<{ user: AuthUser; token: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    signal,
  })
}

/** Backward-compatible helper used by account flow. */
export function demoLogin(
  email = 'marco@esempio.it',
  password = 'password',
  _name = 'Marco Rossi',
  signal?: AbortSignal,
): Promise<{ user: AuthUser; token: string }> {
  return loginAccount(email, password, signal)
}

export function logout(signal?: AbortSignal): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/logout', { method: 'POST', signal })
}
