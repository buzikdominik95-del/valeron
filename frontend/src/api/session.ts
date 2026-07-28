/**
 * Session-level API kill-switch.
 *
 * When Sanctum returns 401 (no cookie / expired session), further REST calls
 * only spam the console and cannot recover until a real login. One flag for
 * the tab lifetime: offline funnel keeps working from localStorage.
 */

let forcedOffline = false

/** After 401 (or unrecoverable auth): stop all API traffic this session. */
export function disableApiForSession(): void {
  forcedOffline = true
}

/** True while API may still be used (env gate is separate in isApiEnabled). */
export function isApiSessionAlive(): boolean {
  return !forcedOffline
}

/** Call after a successful login if you want to re-enable mid-session. */
export function restoreApiSession(): void {
  forcedOffline = false
}
