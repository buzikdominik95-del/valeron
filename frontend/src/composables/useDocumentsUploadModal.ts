import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'

function createDocumentsUploadModal() {
  const open = ref(false)

  function show(): void {
    open.value = true
  }

  function hide(): void {
    open.value = false
  }

  return { open, show, hide }
}

export const useDocumentsUploadModal = createSharedComposable(createDocumentsUploadModal)
