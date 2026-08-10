<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useNativeDialog } from '@/composables/useNativeDialog'

/**
 * L5: предупреждение перед стартом анимации Euroclear.
 * Референс: badge AVVISO + Attenzione + текст + Continua.
 * Палитра — синяя, как кнопка Assistenza (accent-deep).
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ continue: [] }>()

const uid = useId()
const titleId = `vel-l5w-title-${uid}`
const bodyId = `vel-l5w-body-${uid}`

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

function onContinue(): void {
  open.value = false
  emit('continue')
}

function onClose(): void {
  open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-l5w"
    data-testid="l5-warning"
    :aria-labelledby="titleId"
    :aria-describedby="bodyId"
  >
    <form class="vel-l5w__form" @submit.prevent="onContinue">
      <button
        type="button"
        class="vel-l5w__close"
        aria-label="Chiudi"
        @click="onClose"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div class="vel-l5w__head">
        <span class="vel-l5w__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3.5 2.7 19.5a1 1 0 0 0 .87 1.5h16.86a1 1 0 0 0 .87-1.5L12 3.5Z" />
            <path d="M12 10v4.5" />
            <circle cx="12" cy="17.6" r="0.4" fill="currentColor" />
          </svg>
        </span>
        <div class="min-w-0">
          <span class="vel-l5w__badge">AVVISO</span>
          <h2 :id="titleId" class="vel-l5w__title">Attenzione</h2>
        </div>
      </div>

      <p :id="bodyId" class="vel-l5w__body">
        Sono stati registrati frequenti tentativi di prelievo fondi. Sei sicuro di voler continuare?
      </p>

      <button type="submit" class="vel-l5w__cta" data-testid="l5-warning-continue">
        Continua
      </button>
    </form>
  </dialog>
</template>

<style scoped>
.vel-l5w {
  inline-size: min(100% - 2rem, 26rem);
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--color-accent-deep) 35%, transparent);
  border-radius: 1.25rem;
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-accent-deep) 30%, transparent);
}

.vel-l5w::backdrop {
  background-color: color-mix(in oklab, var(--color-accent-deep) 55%, transparent);
}

.vel-l5w__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.75rem 1.5rem 1.5rem;
}

.vel-l5w__close {
  position: absolute;
  inset-block-start: 0.9rem;
  inset-inline-end: 0.9rem;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  padding: 0.25rem;
  border: 0;
  background: none;
  color: var(--color-muted);
  cursor: pointer;
}

.vel-l5w__close:hover {
  color: var(--color-fg);
}

.vel-l5w__head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.vel-l5w__icon {
  display: grid;
  place-items: center;
  inline-size: 3.25rem;
  block-size: 3.25rem;
  flex-shrink: 0;
  border: 1px solid color-mix(in oklab, var(--color-accent-deep) 35%, transparent);
  border-radius: 0.9rem;
  background-color: color-mix(in oklab, var(--color-accent-deep) 8%, var(--color-surface));
  color: var(--color-accent-deep);
}

.vel-l5w__icon svg {
  inline-size: 1.75rem;
  block-size: 1.75rem;
}

.vel-l5w__badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 0.45rem;
  background-color: color-mix(in oklab, var(--color-accent-deep) 12%, var(--color-surface));
  color: var(--color-accent-deep);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.vel-l5w__title {
  margin: 0.3rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-fg);
}

.vel-l5w__body {
  margin: 0;
  padding: 1rem 1.1rem;
  border: 1px solid color-mix(in oklab, var(--color-accent-deep) 25%, transparent);
  border-radius: 0.9rem;
  background-color: color-mix(in oklab, var(--color-accent-deep) 6%, var(--color-surface));
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-fg);
}

.vel-l5w__cta {
  inline-size: 100%;
  padding: 0.9rem 1rem;
  border: 0;
  border-radius: 62.5rem;
  background: linear-gradient(90deg, var(--color-accent-deep), var(--color-accent));
  color: var(--color-accent-ink);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: filter 160ms ease;
}

.vel-l5w__cta:hover {
  filter: brightness(1.12);
}
</style>
