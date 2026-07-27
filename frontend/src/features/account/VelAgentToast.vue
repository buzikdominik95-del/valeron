<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import consultantPhoto from '@/img/consulente-tablet.webp'

/**
 * Toast «Nuovo messaggio» сверху экрана — как карточка консультанта
 * на эталоне (фото 1 брифа 22). Стиль Velora: светлая карточка, зелёный online.
 *
 * Показ/скрытие — снаружи (v-if / model). Клик по карточке ведёт в чат
 * (emit open), крестик только закрывает.
 */
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  open: []
}>()

const { t } = useI18n()
</script>

<template>
  <Transition name="vel-agent-toast">
    <div
      v-if="open"
      class="vel-agent-toast"
      role="status"
      aria-live="polite"
      data-testid="agent-toast"
    >
      <button
        type="button"
        class="vel-agent-toast__card"
        @click="emit('open')"
      >
        <p class="vel-agent-toast__eyebrow">{{ t('account.agentToast.eyebrow') }}</p>
        <div class="vel-agent-toast__row">
          <span class="vel-agent-toast__avatar" aria-hidden="true">
            <img
              class="vel-agent-toast__photo"
              :src="consultantPhoto"
              alt=""
              width="44"
              height="44"
              decoding="async"
            />
          </span>
          <span class="vel-agent-toast__meta">
            <span class="vel-agent-toast__name">{{ t('account.agentToast.agent') }}</span>
            <span class="vel-agent-toast__online">
              <span class="vel-agent-toast__dot" aria-hidden="true" />
              {{ t('account.agentToast.online') }}
            </span>
            <span class="vel-agent-toast__body">{{ t('account.agentToast.body') }}</span>
          </span>
        </div>
      </button>
      <button
        type="button"
        class="vel-agent-toast__x"
        :aria-label="t('account.agentToast.close')"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.vel-agent-toast {
  position: fixed;
  inset-block-start: calc(var(--vel-header-h, 3.5rem) + 0.65rem);
  inset-inline: 0.75rem;
  z-index: 85;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  max-inline-size: 22rem;
  margin-inline: auto;
  pointer-events: none;
}

.vel-agent-toast__card {
  pointer-events: auto;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.45rem;
  min-inline-size: 0;
  margin: 0;
  padding: 0.7rem 2.25rem 0.8rem 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow:
    0 0.5rem 1.5rem color-mix(in oklab, var(--color-fg) 12%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-success) 12%, transparent);
  color: var(--color-fg);
  text-align: start;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.vel-agent-toast__card:hover {
  transform: translateY(-1px);
  box-shadow:
    0 0.65rem 1.75rem color-mix(in oklab, var(--color-fg) 14%, transparent),
    0 0 0 1px color-mix(in oklab, var(--color-success) 22%, transparent);
}

.vel-agent-toast__eyebrow {
  margin: 0;
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.vel-agent-toast__row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-inline-size: 0;
}

.vel-agent-toast__avatar {
  flex: 0 0 auto;
  inline-size: 2.75rem;
  block-size: 2.75rem;
}

.vel-agent-toast__photo {
  inline-size: 100%;
  block-size: 100%;
  border-radius: var(--radius-round);
  object-fit: cover;
  object-position: center 18%;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-success) 28%, transparent);
}

.vel-agent-toast__meta {
  display: flex;
  min-inline-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-agent-toast__name {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.vel-agent-toast__online {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-success);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-agent-toast__dot {
  inline-size: 0.45rem;
  block-size: 0.45rem;
  border-radius: var(--radius-round);
  background: var(--color-success);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-success) 22%, transparent);
}

.vel-agent-toast__body {
  color: var(--color-muted);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.3;
}

.vel-agent-toast__x {
  pointer-events: auto;
  position: absolute;
  inset-block-start: 0.45rem;
  inset-inline-end: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-faint);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.vel-agent-toast__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-agent-toast-enter-active,
.vel-agent-toast-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.vel-agent-toast-enter-from,
.vel-agent-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.65rem);
}

@media (prefers-reduced-motion: reduce) {
  .vel-agent-toast__card,
  .vel-agent-toast-enter-active,
  .vel-agent-toast-leave-active {
    transition: none;
  }
}
</style>
