<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { PAYOUT_METHODS } from '@/api/account.api'
import type { PayoutMethod } from '@/api/account.api'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Выбор способа: radio.
 * layout="tiles" — две плитки (как Calipso), list — столбик с точками.
 */
const model = defineModel<PayoutMethod>({ default: 'iban' })

withDefaults(
  defineProps<{
    layout?: 'list' | 'tiles'
  }>(),
  { layout: 'list' },
)

const { t } = useI18n()
const groupName = `vel-payout-method-${useId()}`

const METHOD_SIGN: Record<PayoutMethod, 'bank' | 'card'> = {
  iban: 'bank',
  card: 'card',
}

const METHOD_HINT: Record<PayoutMethod, string> = {
  iban: 'account.payout.dialog.methodHints.iban',
  card: 'account.payout.dialog.methodHints.card',
}
</script>

<template>
  <div
    class="vel-methods"
    :class="layout === 'tiles' ? 'vel-methods--tiles' : 'vel-methods--list'"
    role="radiogroup"
    :aria-label="t('account.payout.dialog.methodLabel')"
  >
    <label v-for="option in PAYOUT_METHODS" :key="option" class="vel-methods__item">
      <input v-model="model" class="sr-only" type="radio" :name="groupName" :value="option" />

      <span class="vel-methods__face">
        <span v-if="layout === 'list'" class="vel-methods__dot" aria-hidden="true" />
        <VelAccountSign :sign="METHOD_SIGN[option]" class="vel-methods__sign" />
        <span class="vel-methods__copy">
          <span class="vel-methods__label">
            {{
              layout === 'tiles'
                ? t(`account.payout.dialog.methodShort.${option}`)
                : t(`account.payout.dialog.methods.${option}`)
            }}
          </span>
          <span v-if="layout === 'tiles'" class="vel-methods__hint">
            {{ t(METHOD_HINT[option]) }}
          </span>
        </span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.vel-methods--list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.vel-methods--tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.vel-methods__item {
  cursor: pointer;
  min-inline-size: 0;
}

.vel-methods__face {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-ground);
  color: var(--color-muted);
  transition:
    border-color 150ms ease,
    background-color 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.vel-methods--tiles .vel-methods__face {
  flex-direction: column;
  gap: 0.45rem;
  min-block-size: 5.5rem;
  justify-content: center;
  text-align: center;
}

.vel-methods__item:hover .vel-methods__face {
  border-color: var(--color-accent);
}

.vel-methods__dot {
  position: relative;
  flex: 0 0 auto;
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
}

.vel-methods__sign {
  color: inherit;
}

.vel-methods--tiles .vel-methods__sign {
  font-size: 1.35rem;
}

.vel-methods__copy {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-methods__label {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-methods__hint {
  font-size: 0.72rem;
  font-weight: 500;
  opacity: 0.85;
}

.vel-methods__item input:checked + .vel-methods__face {
  border-color: var(--color-accent);
  background-color: color-mix(in oklab, var(--color-accent) 8%, var(--color-surface));
  color: var(--color-accent-deep);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-accent) 25%, transparent);
}

.vel-methods__item input:checked + .vel-methods__face .vel-methods__dot {
  border-color: var(--color-accent);
}

.vel-methods__item input:checked + .vel-methods__face .vel-methods__dot::after {
  content: '';
  position: absolute;
  inset: 0.25rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
}

.vel-methods__item input:focus-visible + .vel-methods__face {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .vel-methods__face {
    transition: none;
  }
}
</style>
