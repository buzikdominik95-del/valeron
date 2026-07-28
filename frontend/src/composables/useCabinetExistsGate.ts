import { ref } from 'vue'
import type { Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useLandingLogin } from '@/composables/useLandingLogin'

/**
 * Полноэкранный «у вас уже есть ЛК»: блокирует повторный квиз после
 * регистрации и предлагает войти в кабинет.
 */
export interface CabinetExistsGateApi {
  open: Ref<boolean>
  show(): void
  hide(): void
  /** true, если заявка уже зарегистрирована (имя + email). */
  hasCabinet: () => boolean
}

function createCabinetExistsGate(): CabinetExistsGateApi {
  const open = ref(false)
  const landing = useLandingLogin()

  function hasCabinet(): boolean {
    return landing.hasCabinetAccess()
  }

  function show(): void {
    open.value = true
  }

  function hide(): void {
    open.value = false
  }

  return { open, show, hide, hasCabinet }
}

export const useCabinetExistsGate = createSharedComposable(createCabinetExistsGate)
