<script setup lang="ts">
/**
 * Порт Magic UI Blur Fade: блок появляется с blur + лёгким сдвигом.
 * CSS-only (без motion), в духе остальных components/magic.
 */
withDefaults(
  defineProps<{
    delayMs?: number
    durationMs?: number
    offsetPx?: number
    direction?: 'up' | 'down'
  }>(),
  {
    delayMs: 0,
    durationMs: 480,
    offsetPx: 12,
    direction: 'up',
  },
)
</script>

<template>
  <div
    class="vel-blur-fade"
    :class="`vel-blur-fade--${direction}`"
    :style="{
      '--vel-bf-delay': `${delayMs}ms`,
      '--vel-bf-dur': `${durationMs}ms`,
      '--vel-bf-offset': `${offsetPx}px`,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.vel-blur-fade {
  animation: vel-bf-up var(--vel-bf-dur, 480ms) cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--vel-bf-delay, 0ms);
}

.vel-blur-fade--down {
  animation-name: vel-bf-down;
}

@keyframes vel-bf-up {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(var(--vel-bf-offset, 12px));
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }
}

@keyframes vel-bf-down {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(calc(-1 * var(--vel-bf-offset, 12px)));
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-blur-fade {
    animation: none;
  }
}
</style>
