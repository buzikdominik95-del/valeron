<script setup lang="ts">
import { watchEffect, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * L4 после анимации: блокирующая модалка.
 * showModal → сайт inert; Escape/backdrop не закрывают.
 * Единственное действие — Telegram менеджера.
 */
const MANAGER_TELEGRAM = 'https://telegram.me/Matteo_Urbano'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

/** Нельзя закрыть Esc — аккаунт «заморожен». */
watchEffect((onCleanup) => {
  const el = dialog.value
  if (!el) return
  const blockCancel = (e: Event): void => {
    e.preventDefault()
  }
  el.addEventListener('cancel', blockCancel)
  onCleanup(() => el.removeEventListener('cancel', blockCancel))
})
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-freeze"
    data-testid="account-freeze-modal"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="vel-freeze-title"
    aria-describedby="vel-freeze-body"
  >
    <div class="vel-freeze__panel">
      <div class="vel-freeze__badge" aria-hidden="true">
        <VelAccountSign sign="lock" />
      </div>

      <h2 id="vel-freeze-title" class="vel-freeze__title">
        {{ t('account.commission.freeze.title') }}
      </h2>

      <p id="vel-freeze-body" class="vel-freeze__body">
        {{ t('account.commission.freeze.body') }}
      </p>

      <p class="vel-freeze__hint">
        {{ t('account.commission.freeze.hint') }}
      </p>

      <a
        class="vel-freeze__cta"
        :href="MANAGER_TELEGRAM"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="account-freeze-telegram"
      >
        {{ t('account.commission.freeze.cta') }}
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </dialog>
</template>

<style scoped>
.vel-freeze {
  inline-size: min(100% - 1.5rem, 26rem);
  max-block-size: min(92dvh, 36rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--color-danger) 45%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.75rem 3.5rem color-mix(in oklab, var(--color-fg) 32%, transparent);
}

.vel-freeze::backdrop {
  background: color-mix(in oklab, var(--color-fg) 72%, transparent);
  backdrop-filter: blur(2px);
}

.vel-freeze__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 1.75rem 1.5rem 1.6rem;
  text-align: center;
}

.vel-freeze__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-danger) 14%, var(--color-surface));
  color: var(--color-danger);
  animation: vel-freeze-pulse 1.8s ease-in-out infinite;
}

.vel-freeze__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.vel-freeze__body {
  margin: 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
}

.vel-freeze__hint {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-danger) 28%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-ground));
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  text-align: start;
  width: 100%;
}

.vel-freeze__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.85rem;
  margin-top: 0.35rem;
  padding: 0.7rem 1.1rem;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    transform 100ms ease;
}

.vel-freeze__cta:hover {
  background: var(--color-accent-dim);
}

.vel-freeze__cta:active {
  transform: scale(0.98);
}

.vel-freeze[open] {
  animation: vel-freeze-in 220ms ease-out;
}

@keyframes vel-freeze-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem) scale(0.97);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-freeze-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-danger) 35%, transparent);
  }

  50% {
    box-shadow: 0 0 0 10px color-mix(in oklab, var(--color-danger) 0%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-freeze[open],
  .vel-freeze__badge,
  .vel-freeze__cta {
    animation: none;
    transition: none;
  }
}
</style>
