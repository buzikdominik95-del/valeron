import { request } from '@/api/http'

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthRegisterPayload extends AuthCredentials {
  name?: string
}

/**
 * SPA auth (Laravel Sanctum cookie session).
 * Без дефолтных паролей — только то, что ввёл пользователь.
 */
export function login(
  payload: AuthCredentials,
  signal?: AbortSignal,
): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: {
      email: payload.email.trim(),
      password: payload.password,
    },
    signal,
  })
}

/** Регистрация кабинета (email + password; name опционально). */
export function register(
  payload: AuthRegisterPayload,
  signal?: AbortSignal,
): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: {
      email: payload.email.trim(),
      password: payload.password,
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
    },
    signal,
  })
}

export function logout(signal?: AbortSignal): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/logout', { method: 'POST', signal })
}
