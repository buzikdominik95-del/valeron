<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelDocumentUpload from '@/features/account/VelDocumentUpload.vue'

const open = defineModel<boolean>('open', { default: false })
const files = defineModel<File[]>('files', { default: () => [] })
const props = withDefaults(
  defineProps<{
    externalError?: string | null
    verify?: (files: File[]) => Promise<string | null>
  }>(),
  {
    externalError: null,
    verify: undefined,
  },
)
const emit = defineEmits<{ verified: [] }>()

const { t } = useI18n()
const uid = useId()
const titleId = `vel-docs-upload-modal-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

useNativeDialog(dialog, open)

function close(): void {
  open.value = false
}

function onVerified(): void {
  emit('verified')
}
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="vel-docs-modal" :aria-labelledby="titleId">
      <div class="vel-docs-modal__panel">
        <header class="vel-docs-modal__head">
          <h2 :id="titleId" class="vel-docs-modal__title">{{ t('account.docs.cardTitle') }}</h2>
          <button
            type="button"
            class="vel-docs-modal__close"
            :aria-label="t('common.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <div class="vel-docs-modal__body">
          <VelDocumentUpload
            v-model="files"
            :external-error="props.externalError"
            :verify="props.verify"
            @verified="onVerified"
          />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.vel-docs-modal {
  inline-size: min(100% - 1rem, 58rem);
  /* Safari < 15.4 не знает dvh и выбрасывает всё правило — сначала vh-фолбэк. */
  max-block-size: 96vh;
  max-block-size: min(96dvh, 100%);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.25rem 2.5rem color-mix(in oklab, var(--color-fg) 22%, transparent);
}

.vel-docs-modal::backdrop {
  background: color-mix(in oklab, var(--color-fg) 45%, transparent);
}

.vel-docs-modal__panel {
  display: flex;
  flex-direction: column;
  max-block-size: 96vh;
  max-block-size: min(96dvh, 100%);
}

.vel-docs-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--color-line);
}

.vel-docs-modal__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.vel-docs-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-docs-modal__close:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-docs-modal__body {
  padding: 0.9rem;
  overflow: auto;
  /* iOS Safari: плавный touch-скролл и запрет прокрутки фона из модалки. */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  min-block-size: 0;
}
</style>
