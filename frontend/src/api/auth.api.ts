import { ApiError } from '@/api/http'

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

function envOr(value: string | undefined, fallback: string): string {
  if (value === undefined) return fallback
  if (value === '') return fallback
  return value
}

const API_ORIGIN = envOr(import.meta.env.VITE_API_ORIGIN, '').replace(/\/+$/, '')
const API_BASE = envOr(import.meta.env.VITE_API_BASE, '/api').replace(/\/+$/, '')

interface ErrorShape {
  message?: string
  errors?: Record<string, string[]>
}

async function authRequest<TResponse>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  try {
    const response = await fetch(`${API_ORIGIN}${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      signal,
      body: JSON.stringify(body),
    })

    const text = await response.text()
    const payload = text.trim() === '' ? {} : (JSON.parse(text) as ErrorShape | TResponse)

    if (!response.ok) {
      const shape = payload as ErrorShape
      throw new ApiError(
        response.status,
        shape.message ?? `Запрос завершился со статусом ${response.status}`,
        shape.errors ?? {},
      )
    }

    return payload as TResponse
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException) {
      if (error.name === 'AbortError') {
        throw new ApiError(0, 'Запрос отменён')
      }
    }

    throw new ApiError(0, error instanceof Error ? error.message : 'Сетевая ошибка')
  }
}

export function registerAccount(
  payload: RegisterPayload,
  signal?: AbortSignal,
): Promise<{ user: AuthUser; token: string }> {
  return authRequest<{ user: AuthUser; token: string }>('/auth/register', payload, signal)
}

export function loginAccount(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<{ user: AuthUser; token: string }> {
  return authRequest<{ user: AuthUser; token: string }>('/auth/login', { email, password }, signal)
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
  return authRequest<{ message: string }>('/auth/logout', {}, signal)
}
