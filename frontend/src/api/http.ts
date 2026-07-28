/**
 * Тонкий клиент поверх fetch под Laravel 12 + Sanctum.
 *
 * Что важно знать бэкендеру:
 * - Ходим с credentials: 'include', то есть на сессионных куках Sanctum,
 *   а не на Bearer-токене. Домен фронта должен быть в SANCTUM_STATEFUL_DOMAINS.
 * - Перед небезопасным запросом убеждаемся, что кука XSRF-TOKEN есть,
 *   иначе дёргаем /sanctum/csrf-cookie и шлём заголовок X-XSRF-TOKEN.
 * - Ошибки валидации Laravel (422) приходят как { message, errors }.
 * - 419 (истёкшая CSRF-сессия) обрабатывается прозрачно: токен обновляется
 *   и запрос повторяется ровно один раз.
 */

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

/** Laravel отвечает этим кодом, когда CSRF-токен протух или не совпал. */
const HTTP_CSRF_EXPIRED = 419
const AUTH_TOKEN_KEY = 'velora:authToken'

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

  /** 422 от Laravel — ошибки валидации по полям. */
  get isValidation(): boolean {
    return this.status === 422
  }

  /** Запрос отменён вызывающей стороной через AbortSignal. */
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

function readAuthToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token === null) return null
  const clean = token.trim()
  return clean === '' ? null : clean
}

/**
 * Один общий промise на время запроса за кукой: N параллельных запросов
 * не должны порождать N сессий на стороне Laravel. Результат намеренно
 * НЕ кэшируется навсегда — источник правды это сама кука, которая
 * протухает вместе с сессией и пропадает после логаута.
 */
let csrfRequest: Promise<void> | null = null

function fetchCsrfCookie(): Promise<void> {
  csrfRequest ??= fetch(CSRF_URL, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new ApiError(response.status, `Не удалось получить CSRF-куку: ${response.status}`)
      }
      if (readCookie(CSRF_COOKIE) === null) {
        throw new ApiError(
          response.status,
          'CSRF-кука не установлена. Обычно это значит, что домен фронта не указан ' +
            'в SANCTUM_STATEFUL_DOMAINS или запрос ушёл на другой origin без CORS с credentials.',
        )
      }
    })
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

async function ensureCsrfCookie(): Promise<void> {
  if (readCookie(CSRF_COOKIE) !== null) return
  await fetchCsrfCookie()
}

export interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
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

  const bearer = readAuthToken()
  if (bearer !== null) {
    headers.Authorization = `Bearer ${bearer}`
  }

  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE)
    if (token !== null) {
      headers['X-XSRF-TOKEN'] = token
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

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const method = (options.method ?? 'GET').toUpperCase()
  const mutating = !SAFE_METHODS.has(method)

  try {
    if (mutating) {
      await ensureCsrfCookie()
    }

    let response = await send(path, method, options)

    // Сессия протухла между получением куки и запросом — обновляем токен
    // и повторяем ровно один раз, чтобы не уйти в цикл.
    if (response.status === HTTP_CSRF_EXPIRED && mutating) {
      expireCsrfCookie()
      await fetchCsrfCookie()
      response = await send(path, method, options)
    }

    const payload = await parseBody(response)

    if (!response.ok) {
      const shape = payload as { message?: string; errors?: ApiValidationErrors } | undefined
      throw new ApiError(
        response.status,
        shape?.message ?? `Запрос завершился со статусом ${response.status}`,
        shape?.errors ?? {},
      )
    }

    return payload as TResponse
  } catch (error) {
    if (error instanceof ApiError) throw error

    // Отмена и сетевой сбой тоже должны приходить как ApiError,
    // иначе вызывающий код с проверкой instanceof ApiError их упустит.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Запрос отменён')
    }

    throw new ApiError(0, error instanceof Error ? error.message : 'Сетевая ошибка')
  }
}
