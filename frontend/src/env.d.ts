/// <reference types="vite/client" />

/**
 * Без этого объявления все VITE_*-переменные типизированы как any,
 * и опечатка в имени переменной проходит мимо strict-режима.
 */
interface ImportMetaEnv {
  /** Origin API. Пусто = тот же origin, в разработке через прокси Vite. */
  readonly VITE_API_ORIGIN?: string
  /** Префикс API. По умолчанию /api. */
  readonly VITE_API_BASE?: string
  /** Куда Vite проксирует /api, /sanctum и /broadcasting в dev-режиме. */
  readonly VITE_API_PROXY?: string

  /** Laravel Reverb — заполняется, когда появится первый вещаемый канал. */
  readonly VITE_REVERB_APP_KEY?: string
  readonly VITE_REVERB_HOST?: string
  readonly VITE_REVERB_PORT?: string
  readonly VITE_REVERB_SCHEME?: string

  /** `1` / `true` — ходить в Laravel API; иначе Pinia-заглушки. */
  readonly VITE_USE_API?: string
  /** `1` / `true` — показать dev-пульт L1–L4 (по умолчанию скрыт). */
  readonly VITE_SHOW_PHASE_BAR?: string
  /** Устарело: пульт по умолчанию выкл; см. VITE_SHOW_PHASE_BAR. */
  readonly VITE_HIDE_PHASE_BAR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
