import { ref } from 'vue'
import type { Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useSimulatorStore } from '@/stores/simulator.store'

/**
 * Диалог «Accedi» с лендинга: не пускаем в кабинет с заглушкой Marco.
 * Общий экземпляр — шапка открывает, App.vue монтирует окно.
 */
export interface LandingLoginApi {
  open: Ref<boolean>
  show(): void
  hide(): void
  /** Есть ли зарегистрированная заявка (имя + email из мастера). */
  hasCabinetAccess: () => boolean
}

function createLandingLogin(): LandingLoginApi {
  const open = ref(false)
  const simulator = useSimulatorStore()
  const { email, firstName, surname } = storeToRefs(simulator)

  function hasCabinetAccess(): boolean {
    const hasEmail = email.value.trim() !== ''
    const hasName = firstName.value.trim() !== '' || surname.value.trim() !== ''
    return hasEmail && hasName
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
