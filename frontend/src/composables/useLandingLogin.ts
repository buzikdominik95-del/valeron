import { ref } from 'vue'
import type { Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { hasAuthToken } from '@/api/session'

/**
 * Диалог «Accedi» с лендинга: не пускаем в кабинет с заглушкой Marco.
 * Общий экземпляр — шапка открывает, App.vue монтирует окно.
 */
export interface LandingLoginApi {
  open: Ref<boolean>
  show(): void
  hide(): void
  /** Есть ли активная авторизованная сессия. */
  hasCabinetAccess: () => boolean
}

function createLandingLogin(): LandingLoginApi {
  const open = ref(false)

  function hasCabinetAccess(): boolean {
    return hasAuthToken()
  }

  function show(): void {
    open.value = true
  }

  function hide(): void {
    open.value = false
  }

  return { open, show, hide, hasCabinetAccess }
}

export const useLandingLogin = createSharedComposable(createLandingLogin)
