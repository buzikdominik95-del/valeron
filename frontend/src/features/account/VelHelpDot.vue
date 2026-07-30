<script setup lang="ts">
/**
 * Мигающий «?» (Calipso): рядом с заголовком / SEPA / green callout.
 */
withDefaults(
  defineProps<{
    label: string
    /** L3/L4 callout: крупнее */
    size?: 'md' | 'lg'
    /** L3/L4: сильнее пульс */
    pulse?: 'soft' | 'strong'
  }>(),
  { size: 'md', pulse: 'soft' },
)

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="vel-help-dot"
    :class="[
      size === 'lg' ? 'vel-help-dot--lg' : '',
      pulse === 'strong' ? 'vel-help-dot--strong' : '',
    ]"
    :aria-label="label"
    @click.stop="emit('click')"
  >
    <span class="vel-help-dot__mark" aria-hidden="true">?</span>
  </button>
</template>

<style scoped>
.vel-help-dot {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  margin: 0;
  padding: 0;
  border: 1.5px solid color-mix(in oklab, var(--color-accent) 55%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 12%, var(--color-surface));
  color: var(--color-accent-deep);
  cursor: pointer;
  vertical-align: middle;
  animation: vel-help-dot-pulse 1.8s ease-in-out infinite;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.vel-help-dot--lg {
  width: 1.85rem;
  height: 1.85rem;
  border-width: 2px;
  background: color-mix(in oklab, var(--color-surface) 92%, var(--color-accent));
  box-shadow: 0 0 0 2px var(--color-surface);
}

.vel-help-dot--lg .vel-help-dot__mark {
  font-size: 0.95rem;
}

.vel-help-dot--strong {
  animation: vel-help-dot-pulse-strong 1.05s ease-in-out infinite;
}

.vel-help-dot:hover {
  background: color-mix(in oklab, var(--color-accent) 22%, var(--color-surface));
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.vel-help-dot:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--color-accent) 45%, transparent);
  outline-offset: 2px;
}

.vel-help-dot__mark {
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
}

@keyframes vel-help-dot-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 35%, transparent);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 0.35rem color-mix(in oklab, var(--color-accent) 0%, transparent);
    opacity: 0.88;
  }
}

@keyframes vel-help-dot-pulse-strong {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 55%, transparent),
      0 0 0 2px var(--color-surface);
    opacity: 1;
  }
  50% {
    transform: scale(1.12);
    box-shadow:
      0 0 0 0.55rem color-mix(in oklab, var(--color-accent) 0%, transparent),
      0 0 0 2px var(--color-surface);
    opacity: 0.92;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-help-dot {
    animation: none;
  }
}
</style>
