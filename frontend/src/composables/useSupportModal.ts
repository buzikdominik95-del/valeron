import { ref } from 'vue'
import type { Ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

export interface SupportModalApi {
  open: Ref<boolean>
  show: () => void
  hide: () => void
  toggle: () => void
}

function createSupportModal(): SupportModalApi {
  const open = ref(false)

  function show(): void {
    open.value = true
  }

  function hide(): void {
    open.value = false
  }

  function toggle(): void {
    open.value = !open.value
  }

  return { open, show, hide, toggle }
}

export const useSupportModal = createSharedComposable(createSupportModal)
