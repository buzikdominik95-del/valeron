<script setup lang="ts">
import type { AccountStep, AccountStepStatus } from '@/stores/account.store'
import VelAccountIcon from '@/features/account/VelAccountIcon.vue'

/**
 * Одна строка списка шагов на Home: знак шага, название, состояние.
 *
 * КЛИКАБЕЛЬНА КАК STEP BAR (бриф, фотка 3): вся строка — ссылка/кнопка,
 * когда canOpen. Щелчок уходит наверх (activate) → openStep с сменой вкладки.
 * «Vai» больше не единственная цель: палец попадает в любую часть ряда.
 *
 * СТРОКИ ПРИХОДЯТ ПЕРЕВЕДЁННЫМИ. Ключи i18n знает список, а строка — только
 * свою разметку.
 *
 * ТРИ СОСТОЯНИЯ РАЗЛИЧАЮТСЯ НЕ ТОЛЬКО ЦВЕТОМ: пройденный — заливка кружка и
 * галочка справа, текущий — кольцо и жирное название, предстоящий — тонкий
 * контур. Плюс строка в .sr-only (WCAG 1.4.1).
 */
const props = defineProps<{
  kind: AccountStep
  status: AccountStepStatus
  title: string
  statusLabel: string
  href: string | undefined
  goLabel: string
  canOpen: boolean
}>()

const emit = defineEmits<{ activate: [event: MouseEvent] }>()
</script>

<template>
  <li class="vel-step-row" :class="`vel-step-row--${status}`">
    <component
      :is="props.canOpen ? 'a' : 'div'"
      class="vel-step-row__hit"
      :class="{ 'vel-step-row__hit--open': props.canOpen }"
      :href="props.canOpen ? (props.href ?? '#') : undefined"
      :aria-current="status === 'current' ? 'step' : undefined"
      :aria-label="props.canOpen ? props.goLabel : undefined"
      @click="props.canOpen && emit('activate', $event)"
    >
      <span class="vel-step-row__mark" aria-hidden="true">
        <VelAccountIcon :kind="kind" />
      </span>

      <span class="vel-step-row__title">{{ title }}</span>

      <span class="sr-only">{{ statusLabel }}</span>

      <span v-if="status === 'done'" class="vel-step-row__done" aria-hidden="true">
        <VelAccountIcon kind="check" />
      </span>

      <span v-else-if="props.canOpen" class="vel-step-row__go" aria-hidden="true">
        →
      </span>
    </component>
  </li>
</template>

<style scoped>
.vel-step-row {
  --vel-mark: 1.75rem;

  list-style: none;
}

.vel-step-row__hit {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 2.75rem;
  margin: 0;
  padding-block: 0.15rem;
  border-radius: var(--radius-control);
  color: inherit;
  text-decoration: none;
}

.vel-step-row__hit--open {
  cursor: pointer;
}

.vel-step-row__hit--open:hover {
  background: color-mix(in oklab, var(--color-accent) 6%, transparent);
}

.vel-step-row__hit--open:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.vel-step-row__mark {
  --vel-icon-size: 0.95rem;

  display: flex;
  inline-size: var(--vel-mark);
  block-size: var(--vel-mark);
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-faint);
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease;
}

.vel-step-row--done .vel-step-row__mark {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.vel-step-row--current .vel-step-row__mark {
  border-width: 2px;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 16%, transparent);
  color: var(--color-accent-deep);
}

.vel-step-row__title {
  min-inline-size: 0;
  flex: 1 1 auto;
  font-size: 0.9rem;
  line-height: 1.3;
  color: var(--color-muted);
}

.vel-step-row--done .vel-step-row__title {
  color: var(--color-fg);
}

.vel-step-row--current .vel-step-row__title {
  color: var(--color-accent-deep);
  font-weight: 600;
}

.vel-step-row__done {
  --vel-icon-size: 1.05rem;

  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.vel-step-row__go {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-inline-size: 1.5rem;
  color: var(--color-accent);
  font-size: 1rem;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .vel-step-row__mark {
    transition: none;
  }
}
</style>
