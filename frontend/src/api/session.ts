/**
 * Session-level API state: kill-switch + Sanctum personal access token.
 */

const TOKEN_KEY = 'velora:authToken'
const LEGACY_TOKEN_KEY = 'velora:auth:token'

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
  try {
    const current = cleanToken(localStorage.getItem(TOKEN_KEY))
    if (current) return current

    const legacy = cleanToken(localStorage.getItem(LEGACY_TOKEN_KEY))
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy)
      localStorage.removeItem(LEGACY_TOKEN_KEY)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    /* private mode */
  }
  forcedOffline = false
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    /* private mode */
  }
}

export function hasAuthToken(): boolean {
  return getAuthToken() !== null
}
