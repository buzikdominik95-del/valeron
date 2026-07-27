<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHAT_MAX_LENGTH } from '@/features/account/chat-thread'

/**
 * Строка ввода: поле + кнопка с анимацией отправки.
 */
const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    canSend: boolean
    sending?: boolean
    justSent?: boolean
    /** Воронка: плейсхолдер/акцент «сообщение консультанту». */
    funnel?: boolean
  }>(),
  {
    sending: false,
    justSent: false,
    funnel: false,
  },
)

const emit = defineEmits<{ send: [] }>()

const { t } = useI18n()

const MAX_ROWS = 5
const LINE_REM = 1.35

const area = ref<HTMLTextAreaElement | null>(null)

const rest = computed(() => CHAT_MAX_LENGTH - model.value.length)
const showRest = computed(() => rest.value <= 120)

const placeholder = computed(() =>
  props.funnel
    ? t('account.support.chat.funnelPlaceholder')
    : t('account.support.chat.placeholder'),
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
</script>

<template>
  <form
    class="vel-composer"
    :class="{
      'vel-composer--funnel': funnel,
      'vel-composer--sending': sending,
      'vel-composer--sent': justSent,
    }"
    @submit.prevent="emit('send')"
  >
    <label class="sr-only" for="vel-chat-input">{{ t('account.support.chat.inputLabel') }}</label>

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

    <p v-if="showRest" class="vel-composer__rest vel-num" aria-live="polite">
      {{ rest }}
    </p>
  </form>
</template>

<style scoped>
.vel-composer {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
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
  font-size: 0.9rem;
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
