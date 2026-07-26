import { request } from '@/api/http'

export interface AuthUser {
  id: number
  name: string
  email: string
}

/** Demo SPA login (Sanctum session cookie). */
export function demoLogin(
  email = 'marco@esempio.it',
  password = 'password',
  name = 'Marco Rossi',
  signal?: AbortSignal,
): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/demo-login', {
    method: 'POST',
    body: { email, password, name },
    signal,
  })
}

export function logout(signal?: AbortSignal): Promise<{ ok: true }> {
  return request<{ ok: true }>('/auth/logout', { method: 'POST', signal })
}
