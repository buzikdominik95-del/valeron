<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHAT_MAX_LENGTH } from '@/features/account/chat-thread'
import type { ChatAttachment } from '@/features/account/chat-thread'

/**
 * Строка ввода: поле + вложение (фото/файл) + кнопка отправки.
 */
const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    canSend: boolean
    sending?: boolean
    justSent?: boolean
    /** Воронка: плейсхолдер/акцент «сообщение консультанту». */
    funnel?: boolean
    /** Выбранное фото/файл (из useSupportChat). */
    pendingAttachment?: ChatAttachment | null
  }>(),
  {
    sending: false,
    justSent: false,
    funnel: false,
    pendingAttachment: null,
  },
)

const emit = defineEmits<{
  send: []
  'update:pendingAttachment': [value: ChatAttachment | null]
  'picker-open': []
}>()

const { t } = useI18n()

const MAX_ROWS = 5
const LINE_REM = 1.35
const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Фото + PDF + офисные документы + текст. */
const FILE_ACCEPT =
  'image/*,image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tif?f)$/i
const DOC_EXT = /\.(pdf|docx?|xlsx?|txt|rtf|csv)$/i

const area = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const rest = computed(() => CHAT_MAX_LENGTH - model.value.length)
const showRest = computed(() => rest.value <= 120)

const placeholder = computed(() =>
  props.funnel
    ? t('account.support.chat.funnelPlaceholder')
    : t('account.support.chat.placeholder'),
)

const isImagePending = computed(
  () => props.pendingAttachment?.kind === 'image' && Boolean(props.pendingAttachment.url),
)

function resize(): void {
  const element = area.value
  if (element === null) return
  element.style.height = 'auto'
  const max =
    MAX_ROWS * LINE_REM * parseFloat(getComputedStyle(document.documentElement).fontSize)
  element.style.height = `${Math.min(element.scrollHeight, max)}px`
}

watch(model, () => void nextTick(resize), { immediate: true })

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey) return
  if (event.isComposing) return
  event.preventDefault()
  if (props.canSend) emit('send')
}

function openPicker(): void {
  emit('picker-open')
  fileInput.value?.click()
}

function clearAttachment(): void {
  emit('update:pendingAttachment', null)
  if (fileInput.value) fileInput.value.value = ''
}

function isAllowedFile(file: File): boolean {
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return false
  const type = (file.type || '').toLowerCase()
  const name = file.name || ''
  if (type.startsWith('image/')) return true
  if (
    type === 'application/pdf' ||
    type === 'application/msword' ||
    type.includes('wordprocessingml') ||
    type.includes('spreadsheetml') ||
    type === 'application/vnd.ms-excel' ||
    type === 'text/plain' ||
    type === 'text/csv' ||
    type === 'application/rtf' ||
    type === 'text/rtf'
  ) {
    return true
  }
  /* Мобильные камеры / WebView часто type=''. */
  if (type === '' || type === 'application/octet-stream') {
    return IMAGE_EXT.test(name) || DOC_EXT.test(name)
  }
  return IMAGE_EXT.test(name) || DOC_EXT.test(name)
}

function kindForFile(file: File): 'image' | 'file' {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (IMAGE_EXT.test(file.name || '')) return 'image'
  return 'file'
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!isAllowedFile(file)) {
    input.value = ''
    return
  }

  const kind = kindForFile(file)
  /* blob: URL + File в памяти — не data: в localStorage (QuotaExceeded). */
  const url = URL.createObjectURL(file)
  emit('update:pendingAttachment', {
    kind,
    name: file.name || (kind === 'image' ? 'photo.jpg' : 'file'),
    url,
    mime: file.type || (kind === 'image' ? 'image/jpeg' : 'application/octet-stream'),
    file,
  })
  input.value = ''
}
</script>

<template>
  <form
    class="vel-composer"
    :class="{
      'vel-composer--funnel': funnel,
      'vel-composer--sending': sending,
      'vel-composer--sent': justSent,
      'vel-composer--attach': Boolean(pendingAttachment),
    }"
    @submit.prevent="emit('send')"
  >
    <div v-if="pendingAttachment" class="vel-composer__preview">
      <img
        v-if="isImagePending"
        class="vel-composer__thumb"
        :src="pendingAttachment.url"
        alt=""
      />
      <span v-else class="vel-composer__filechip">
        <svg class="vel-composer__file-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3.5h7.2L17.5 6.8V20.5H7V3.5Z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path d="M14.2 3.5V6.9H17.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          <path d="M9.2 12h5.6M9.2 15.2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span class="vel-composer__file-name">{{ pendingAttachment.name }}</span>
      </span>
      <button
        type="button"
        class="vel-composer__photo-x"
        :aria-label="t('account.support.chat.removeFile')"
        @click="clearAttachment"
      >
        ×
      </button>
    </div>

    <div class="vel-composer__row">
      <label class="sr-only" for="vel-chat-input">{{ t('account.support.chat.inputLabel') }}</label>

      <button
        type="button"
        class="vel-composer__attach"
        :disabled="sending"
        :aria-label="t('account.support.chat.attachFile')"
        data-testid="chat-attach-file"
        @click="openPicker"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15.5 7.5 9.2 13.8a2.6 2.6 0 0 0 3.7 3.7l7.4-7.4a4.2 4.2 0 0 0-5.9-5.9l-8 8a5.8 5.8 0 0 0 8.2 8.2l5.6-5.6"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        :accept="FILE_ACCEPT"
        name="vel-chat-file"
        @change="onFileChange"
      />

      <textarea
        id="vel-chat-input"
        ref="area"
        v-model="model"
        class="vel-composer__area"
        rows="1"
        :maxlength="CHAT_MAX_LENGTH"
        :placeholder="placeholder"
        :disabled="sending"
        @keydown="onKeydown"
      ></textarea>

      <button
        type="submit"
        class="vel-composer__send"
        :disabled="!canSend"
        :aria-label="t('account.support.chat.send')"
        :aria-busy="sending || undefined"
      >
        <svg class="vel-composer__plane" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3.5 11.5 20.5 4l-7.5 17-2.2-7.3z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="miter"
          />
          <path d="m10.8 13.7 4.4-4.4" stroke="currentColor" stroke-width="1.8" />
        </svg>
        <span class="vel-composer__ripple" aria-hidden="true" />
      </button>
    </div>

    <p v-if="showRest" class="vel-composer__rest vel-num" aria-live="polite">
      {{ rest }}
    </p>
  </form>
</template>

<style scoped>
.vel-composer {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.55rem 0.55rem 0.6rem;
  border-block-start: 1px solid var(--color-line);
  background-color: var(--color-surface);
}

.vel-composer--funnel {
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--color-accent) 6%, var(--color-surface)),
    var(--color-surface)
  );
}

.vel-composer__row {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
}

.vel-composer__preview {
  position: relative;
  align-self: flex-start;
  margin-inline-start: 2.9rem;
  max-inline-size: min(100% - 3rem, 18rem);
}

.vel-composer__thumb {
  display: block;
  inline-size: 4.5rem;
  block-size: 4.5rem;
  border-radius: var(--radius-control);
  object-fit: cover;
  border: 1px solid var(--color-line-strong);
}

.vel-composer__filechip {
  display: inline-flex;
  max-inline-size: 100%;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.65rem 0.4rem 0.45rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  color: var(--color-fg);
  font-size: 0.8rem;
  line-height: 1.25;
}

.vel-composer__file-ico {
  flex: 0 0 auto;
  inline-size: 1.15rem;
  block-size: 1.15rem;
  color: var(--color-accent-deep);
}

.vel-composer__file-name {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-composer__photo-x {
  position: absolute;
  inset-block-start: -0.35rem;
  inset-inline-end: -0.35rem;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border: 0;
  border-radius: var(--radius-round);
  background: var(--color-fg);
  color: var(--color-surface);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.vel-composer__attach {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 2.5rem;
  block-size: 2.75rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-panel);
  background: var(--color-ground);
  color: var(--color-muted);
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.vel-composer__attach svg {
  inline-size: 1.2rem;
  block-size: 1.2rem;
}

.vel-composer__attach:hover:not(:disabled) {
  color: var(--color-accent-deep);
  border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-line-strong));
  background: color-mix(in oklab, var(--color-accent) 8%, var(--color-ground));
}

.vel-composer__attach:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.vel-composer__area {
  min-inline-size: 0;
  flex: 1 1 auto;
  min-block-size: 2.75rem;
  max-block-size: 9rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-panel);
  background-color: var(--color-ground);
  color: var(--color-fg);
  font: inherit;
  /* >=16px: иначе iOS зумит страницу при фокусе и не всегда возвращает масштаб */
  font-size: 1rem;
  line-height: 1.35;
  resize: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.vel-composer--funnel .vel-composer__area {
  border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-line-strong));
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 10%, transparent);
}

.vel-composer__area:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.vel-composer__area:disabled {
  opacity: 0.7;
}

.vel-composer__send {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-round);
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    transform 150ms ease,
    box-shadow 150ms ease;
}

.vel-composer__send:hover:not(:disabled) {
  background-color: var(--color-accent-dim);
  transform: scale(1.04);
  box-shadow: 0 4px 14px color-mix(in oklab, var(--color-accent-deep) 35%, transparent);
}

.vel-composer__send:disabled {
  background-color: var(--color-track);
  color: var(--color-faint);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.vel-composer__send:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.vel-composer__plane {
  position: relative;
  z-index: 1;
  inline-size: 1.15rem;
  block-size: 1.15rem;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-composer--sent .vel-composer__plane {
  animation: vel-plane-fly 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-composer--sending .vel-composer__send {
  pointer-events: none;
}

.vel-composer__ripple {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: color-mix(in oklab, var(--color-accent-ink) 35%, transparent);
  opacity: 0;
  transform: scale(0.4);
}

.vel-composer--sent .vel-composer__ripple {
  animation: vel-send-ripple 0.55s ease-out both;
}

.vel-composer__rest {
  position: absolute;
  inset-block-start: -1.1rem;
  inset-inline-end: 0.6rem;
  margin: 0;
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

@keyframes vel-plane-fly {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }

  55% {
    transform: translate(10px, -12px) rotate(18deg) scale(1.08);
    opacity: 1;
  }

  100% {
    transform: translate(22px, -28px) rotate(28deg) scale(0.55);
    opacity: 0;
  }
}

@keyframes vel-send-ripple {
  0% {
    opacity: 0.55;
    transform: scale(0.35);
  }

  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-composer__send,
  .vel-composer__plane,
  .vel-composer__area {
    transition: none;
  }

  .vel-composer--sent .vel-composer__plane,
  .vel-composer--sent .vel-composer__ripple {
    animation: none;
  }
}
</style>
