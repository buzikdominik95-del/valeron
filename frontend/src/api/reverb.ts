/**
 * Bootstrap Laravel Echo → Reverb.
 *
 * Пока VITE_REVERB_APP_KEY пуст, клиент не поднимается (dev без сокета).
 * Когда бэкендер включит Reverb: заполнить .env, поставить
 *   npm i laravel-echo pusher-js
 * и раскомментировать createEcho() ниже (или подключить динамический import).
 *
 * Стек: Laravel 12 + Reverb + Redis (broadcasting connection).
 */

export interface ReverbConfig {
  key: string
  host: string
  port: number
  scheme: 'http' | 'https'
  authEndpoint: string
}

export function readReverbConfig(): ReverbConfig | null {
  const key = import.meta.env.VITE_REVERB_APP_KEY?.trim() ?? ''
  if (key === '') return null

  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)
  const scheme = (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https' ? 'https' : 'http'

  return {
    key,
    host: import.meta.env.VITE_REVERB_HOST?.trim() || 'localhost',
    port: Number.isFinite(port) ? port : 8080,
    scheme,
    /** Vite proxy → Laravel broadcasting/auth (Sanctum cookie). */
    authEndpoint: '/broadcasting/auth',
  }
}

/**
 * Подписка на заявку. Сейчас no-op: Echo ещё не в package.json.
 * Сигнатура стабильна — useAccountRealtime вызовет subscribeApplication.
 */
export interface ApplicationChannel {
  leave: () => void
}

export function subscribeApplication(
  _applicationId: string,
  _handlers: {
    onCommission?: (payload: unknown) => void
    onAccount?: (payload: unknown) => void
    onTransfer?: (payload: unknown) => void
    onBank?: (payload: unknown) => void
    onMessage?: (payload: unknown) => void
  },
): ApplicationChannel {
  const cfg = readReverbConfig()
  if (cfg === null) {
    return { leave: () => undefined }
  }

  /*
   * TODO (когда бэкенд поднимет Reverb):
   * import Echo from 'laravel-echo'
   * import Pusher from 'pusher-js'
   * window.Pusher = Pusher
   * const echo = new Echo({
   *   broadcaster: 'reverb',
   *   key: cfg.key,
   *   wsHost: cfg.host,
   *   wsPort: cfg.port,
   *   wssPort: cfg.port,
   *   forceTLS: cfg.scheme === 'https',
   *   enabledTransports: ['ws', 'wss'],
   *   authEndpoint: cfg.authEndpoint,
   *   withCredentials: true,
   * })
   * const ch = echo.private(`application.${applicationId}`)
   * ch.listen(REVERB_EVENTS.commissionUpdated, handlers.onCommission)
   * ...
   * return { leave: () => echo.leave(`application.${applicationId}`) }
   */
  console.info('[reverb] key set but Echo not installed yet — skip subscribe')
  return { leave: () => undefined }
}
