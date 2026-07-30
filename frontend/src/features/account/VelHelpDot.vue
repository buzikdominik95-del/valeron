<script setup lang="ts">
/**
 * Мигающий «?» — один размер и пульс везде (заголовок, SEPA, green callout).
 */
defineProps<{
  label: string
  /** @deprecated единый размер; prop оставлен для совместимости вызовов */
  size?: 'md' | 'lg'
  /** @deprecated единый пульс; prop оставлен для совместимости вызовов */
  pulse?: 'soft' | 'strong'
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="vel-help-dot"
    :aria-label="label"
    @click.stop="emit('click')"
  >
    <span class="vel-help-dot__mark" aria-hidden="true">?</span>
  </button>
</template>

<style scoped>
.vel-help-dot {
  --help-d: 1.3rem;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--help-d);
  height: var(--help-d);
  min-width: var(--help-d);
  min-height: var(--help-d);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  border: 2px solid #5aaf8f;
  border-radius: 999px;
  background: #eef8f3;
  color: #1a6b52;
  cursor: pointer;
  vertical-align: middle;
  box-shadow:
    0 0 0 2.5px #fff,
    0 1px 3px rgba(15, 23, 42, 0.1);
  animation: vel-help-dot-pulse 1.15s ease-in-out infinite;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.vel-help-dot:hover {
  background: #e0f3ea;
  border-color: #4a9e7f;
  color: #145a45;
}

.vel-help-dot:focus-visible {
  outline: 2px solid color-mix(in oklab, #5aaf8f 55%, transparent);
  outline-offset: 2px;
}

.vel-help-dot__mark {
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  color: inherit;
}

@keyframes vel-help-dot-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 0 2.5px #fff,
      0 0 0 0 rgba(90, 175, 143, 0.45);
  }
  50% {
    transform: scale(1.1);
    box-shadow:
      0 0 0 2.5px #fff,
      0 0 0 0.45rem rgba(90, 175, 143, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-help-dot {
    animation: none;
  }
}
</style>
