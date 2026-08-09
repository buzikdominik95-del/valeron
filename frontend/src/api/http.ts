/**
 * HTTP client for Velora Laravel API.
 *
 * Backend auth = Sanctum **personal access token** (Bearer), not SPA cookies:
 *   login/register → { user, token }
 *   further calls → Authorization: Bearer <token>
 *
 * CSRF cookies are optional (legacy SPA path). Bearer requests work without them.
 * 401 on non-auth routes → disableApiForSession().
 */

import {
  disableApiForSession,
  getAuthToken,
  restoreApiSession,
} from '@/api/session'

/** Пустая строка — валидное значение переменной окружения, а ?? её не отловит. */
function envOr(value: string | undefined, fallback: string): string {
  return value === undefined || value === '' ? fallback : value
}

/** Пусто = тот же origin (в разработке запросы уходят через прокси Vite). */
const API_ORIGIN = envOr(import.meta.env.VITE_API_ORIGIN, '').replace(/\/+$/, '')
const API_BASE = envOr(import.meta.env.VITE_API_BASE, '/api').replace(/\/+$/, '')

const CSRF_URL = `${API_ORIGIN}/sanctum/csrf-cookie`
const CSRF_COOKIE = 'XSRF-TOKEN'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const HTTP_CSRF_EXPIRED = 419

/** Public auth paths — 401 = bad credentials, not dead session. */
const AUTH_PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/demo-login',
  '/auth/logout',
])

export interface ApiValidationErrors {
  [field: string]: string[]
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiValidationErrors

  constructor(status: number, message: string, errors: ApiValidationErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isAborted(): boolean {
    return this.status === 0
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function expireCsrfCookie(): void {
  document.cookie = `${CSRF_COOKIE}=; Max-Age=0; path=/`
}

let csrfRequest: Promise<void> | null = null

function fetchCsrfCookie(): Promise<void> {
  csrfRequest ??= fetch(CSRF_URL, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then((response) => {
      /*
       * Self-heal: если сессия была временно переведена в offline после 401,
       * любой успешный API-ответ возвращает её в online без hard refresh.
       */
      restoreApiSession()

      if (!response.ok) {
        /* Token API works without CSRF — soft-fail. */
        return
      }
    })
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

async function ensureCsrfCookie(): Promise<void> {
  if (readCookie(CSRF_COOKIE) !== null) return
  try {
    await fetchCsrfCookie()
  } catch {
    /* Bearer mode does not require CSRF */
  }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Skip Authorization header (unused; public routes still get token if set). */
  skipAuth?: boolean
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined

  const text = await response.text()
  if (text.trim() === '') return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError(
      response.status,
      `Ответ ${response.status} не является JSON: ${text.slice(0, 120)}`,
    )
  }
}

async function send(path: string, method: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const bearer = options.skipAuth ? null : getAuthToken()
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`
  }

  /* Cookie CSRF only if cookie present (SPA hybrid). */
  if (!SAFE_METHODS.has(method)) {
    const xsrf = readCookie(CSRF_COOKIE)
    if (xsrf !== null) {
      headers['X-XSRF-TOKEN'] = xsrf
    }
  }

  return fetch(`${API_ORIGIN}${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

function formatErrorMessage(
  payload: unknown,
  status: number,
): { message: string; errors: ApiValidationErrors } {
  const shape = payload as
    | { message?: string; errors?: ApiValidationErrors }
    | undefined
  const errors = shape?.errors ?? {}
  if (shape?.message) return { message: shape.message, errors }

  /* Laravel 422 often only { errors: { field: [...] } } */
  const firstField = Object.keys(errors)[0]
  if (firstField && errors[firstField]?.[0]) {
    return { message: errors[firstField][0], errors }
  }

  return {
    message: `Запрос завершился со статусом ${status}`,
    errors,
  }
}

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const method = (options.method ?? 'GET').toUpperCase()
  const mutating = !SAFE_METHODS.has(method)

  try {
    if (mutating && !getAuthToken()) {
      await ensureCsrfCookie()
    }

    let response = await send(path, method, options)

    if (response.status === HTTP_CSRF_EXPIRED && mutating) {
      expireCsrfCookie()
      await fetchCsrfCookie()
      response = await send(path, method, options)
    }

    const payload = await parseBody(response)

    if (!response.ok) {
      if (response.status === 401 && !AUTH_PUBLIC_PATHS.has(path)) {
        disableApiForSession()
      }
      const { message, errors } = formatErrorMessage(payload, response.status)
      throw new ApiError(response.status, message, errors)
    }

    /*
     * Self-heal: после любого успешного API-ответа возвращаем online-режим
     * (если раньше был временный disable после 401).
     */
    restoreApiSession()

    return payload as TResponse
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Запрос отменён')
    }

    throw new ApiError(0, error instanceof Error ? error.message : 'Сетевая ошибка')
  }
}
