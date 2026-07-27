<script setup lang="ts">
import { computed } from 'vue'

/**
 * Полоса 0…1 без style= и setProperty: ширина через SVG attribute.
 * Роли цветов — currentColor / CSS-классы.
 */
const props = withDefaults(
  defineProps<{
    /** 0…1 */
    value: number
    label: string
  }>(),
  {},
)

const clamped = computed(() => Math.min(1, Math.max(0, props.value)))
const pct = computed(() => Math.round(clamped.value * 100))
const width = computed(() => clamped.value * 100)
</script>

<template>
  <div
    class="vel-meter"
    role="progressbar"
    :aria-valuenow="pct"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <svg class="vel-meter__svg" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
      <rect class="vel-meter__track" x="0" y="0" width="100" height="4" rx="2" />
      <rect class="vel-meter__fill" x="0" y="0" :width="width" height="4" rx="2" />
    </svg>
  </div>
</template>

<style scoped>
.vel-meter {
  display: block;
  width: 100%;
}

.vel-meter__svg {
  display: block;
  width: 100%;
  height: 0.45rem;
  border-radius: var(--radius-round);
  overflow: hidden;
}

.vel-meter__track {
  fill: var(--color-line);
}

.vel-meter__fill {
  fill: var(--color-accent);
  transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Лёгкий «shimmer» по заполненной части — как у Stripe/Linear progress */
.vel-meter__svg {
  position: relative;
}

@media (prefers-reduced-motion: reduce) {
  .vel-meter__fill {
    transition: none;
  }
}
</style>
