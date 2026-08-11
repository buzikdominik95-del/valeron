/**
 * Демо-флаг «ускорить длинные ожидания»: ?fastAnim=1 или
 * localStorage velora:fastAnim=1.
 *
 * ВАЖНО: на проде ускоритель выключен по умолчанию, даже если в URL или localStorage есть
 * fastAnim. Разрешается только при явном VITE_ENABLE_FAST_ANIM=1/true
 * либо на localhost для локальной разработки.
 */
function isFastAnimAllowed(): boolean {
  if (typeof window === 'undefined') return false

  const envRaw = import.meta.env.VITE_ENABLE_FAST_ANIM
  const env = String(envRaw ?? '').trim().toLowerCase()

  if (env === '1') return true
  if (env === 'true') return true

  const host = window.location.hostname
  if (host === 'localhost') return true
  if (host === '127.0.0.1') return true
  return false
}

export function wantsFastAnim(): boolean {
  if (!isFastAnimAllowed()) return false

  try {
    if (window.localStorage.getItem('velora:fastAnim') === '1') return true
  } catch {
    /* приватный режим — остаётся только адресная строка */
  }
  return new URLSearchParams(window.location.search).get('fastAnim') === '1'
}

export const FAST_ANIM_FACTOR = 0.2

export function fastAnimMs(ms: number): number {
  return wantsFastAnim() ? ms * FAST_ANIM_FACTOR : ms
}
