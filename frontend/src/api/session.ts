/**
 * Session-level API state: kill-switch + Sanctum personal access token.
 */

const TOKEN_KEY = 'velora:authToken'
const LEGACY_TOKEN_KEY = 'velora:auth:token'
const TOKEN_COOKIE = 'velora_auth'

/*
 * Safari (private mode / ITP) may throw on localStorage or wipe it between
 * navigations. Keep the token in memory for the page lifetime and mirror it
 * into a first-party cookie so reloads survive even without localStorage.
 */
let memoryToken: string | null = null

function readTokenCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + TOKEN_COOKIE + '=([^;]*)'))
    return m?.[1] ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}

function writeTokenCookie(token: string | null): void {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    if (token === null) {
      document.cookie = TOKEN_COOKIE + '=; Max-Age=0; Path=/; SameSite=Lax' + secure
      return
    }
    document.cookie =
      TOKEN_COOKIE + '=' + encodeURIComponent(token) +
      '; Max-Age=' + 60 * 60 * 24 * 30 + '; Path=/; SameSite=Lax' + secure
  } catch {
    /* cookies disabled */
  }
}

let forcedOffline = false

export function disableApiForSession(): void {
  forcedOffline = true
}

export function isApiSessionAlive(): boolean {
  return !forcedOffline
}

export function restoreApiSession(): void {
  forcedOffline = false
}

function cleanToken(raw: string | null): string | null {
  if (!raw) return null
  const t = raw.trim()
  return t !== '' ? t : null
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken

  try {
    const current = cleanToken(localStorage.getItem(TOKEN_KEY))
    if (current) {
      memoryToken = current
      return current
    }

    const legacy = cleanToken(localStorage.getItem(LEGACY_TOKEN_KEY))
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy)
      localStorage.removeItem(LEGACY_TOKEN_KEY)
      memoryToken = legacy
      return legacy
    }
  } catch {
    /* private mode: fall through to cookie */
  }

  const fromCookie = cleanToken(readTokenCookie())
  if (fromCookie) {
    memoryToken = fromCookie
    try {
      localStorage.setItem(TOKEN_KEY, fromCookie)
    } catch {
      /* keep cookie + memory only */
    }
    return fromCookie
  }
  return null
}

export function setAuthToken(token: string): void {
  memoryToken = cleanToken(token)
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    /* private mode: memory + cookie keep the session alive */
  }
  writeTokenCookie(memoryToken)
  forcedOffline = false
}

export function clearAuthToken(): void {
  memoryToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    /* private mode */
  }
  writeTokenCookie(null)
}

export function hasAuthToken(): boolean {
  return getAuthToken() !== null
}
