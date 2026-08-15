<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
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

/* Отказ ИИ: встряска модалки + красная вспышка по краям. Класс снимается
   по таймеру, чтобы повторный отказ перезапускал CSS-анимацию. */
const shaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function onRejected(): void {
  shaking.value = false
  requestAnimationFrame(() => {
    shaking.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shaking.value = false
      shakeTimer = null
    }, 1000)
  })
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="vel-docs-modal"
      :class="{ 'vel-docs-modal--rejected': shaking }"
      :aria-labelledby="titleId"
    >
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
            @rejected="onRejected"
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
  max-block-size: 92vh;
  max-block-size: min(92dvh, 100%);
  margin: 1.15rem auto 0;
  overflow: visible;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.25rem 2.5rem color-mix(in oklab, var(--color-fg) 22%, transparent);
}

.vel-docs-modal--rejected {
  animation:
    vel-docs-shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97),
    vel-docs-flash 0.9s ease-out;
}

@keyframes vel-docs-shake {
  10%,
  90% {
    transform: translateX(-0.2rem);
  }

  20%,
  80% {
    transform: translateX(0.35rem);
  }

  30%,
  50%,
  70% {
    transform: translateX(-0.5rem);
  }

  40%,
  60% {
    transform: translateX(0.5rem);
  }
}

@keyframes vel-docs-flash {
  0% {
    box-shadow:
      0 0 0 3px color-mix(in oklab, var(--color-danger, #d33) 85%, transparent),
      0 0 2.5rem 0.5rem color-mix(in oklab, var(--color-danger, #d33) 55%, transparent);
  }

  100% {
    box-shadow:
      0 0 0 3px transparent,
      0 1.25rem 2.5rem color-mix(in oklab, var(--color-fg) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-docs-modal--rejected {
    animation: vel-docs-flash 0.9s ease-out;
  }
}

.vel-docs-modal::backdrop {
  background: color-mix(in oklab, var(--color-fg) 45%, transparent);
}

.vel-docs-modal__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  max-block-size: 92vh;
  max-block-size: min(92dvh, 100%);
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
  flex: 1 1 auto;
  min-block-size: 0;
  padding: 0.9rem;
  overflow: auto;
  /* iOS Safari: плавный touch-скролл и запрет прокрутки фона из модалки. */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

@media (max-width: 640px) {
  .vel-docs-modal {
    inline-size: calc(100% - 0.75rem);
    max-block-size: calc(100dvh - 0.75rem);
    margin: 0.9rem auto 0.375rem;
  }

  .vel-docs-modal__panel {
    max-block-size: calc(100dvh - 0.75rem);
  }
}

</style>

