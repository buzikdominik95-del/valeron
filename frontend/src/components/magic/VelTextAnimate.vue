<script setup lang="ts">
import { computed } from 'vue'

/**
 * Порт Magic UI Text Animate (blurIn / fadeIn по словам) без motion:
 * чистый CSS + staggered delay. Доступность: полный текст в aria / sr-only.
 */
const props = withDefaults(
  defineProps<{
    text: string
    /** fade | blur | blurUp */
    animation?: 'fade' | 'blur' | 'blurUp'
    /** ms между сегментами */
    staggerMs?: number
    /** ms длительности сегмента */
    durationMs?: number
    /** ms перед стартом */
    delayMs?: number
    as?: 'p' | 'span' | 'h2' | 'h3' | 'div'
  }>(),
  {
    animation: 'blurUp',
    staggerMs: 48,
    durationMs: 420,
    delayMs: 40,
    as: 'p',
  },
)

const words = computed(() => {
  const raw = props.text.trim()
  if (raw === '') return [] as string[]
  return raw.split(/(\s+)/).filter((s) => s.length > 0)
})
</script>

<template>
  <component
    :is="as"
    class="vel-tanim"
    :class="`vel-tanim--${animation}`"
    :style="{
      '--vel-tanim-dur': `${durationMs}ms`,
      '--vel-tanim-delay': `${delayMs}ms`,
      '--vel-tanim-stagger': `${staggerMs}ms`,
    }"
    :aria-label="text"
  >
    <span class="sr-only">{{ text }}</span>
    <span
      v-for="(seg, i) in words"
      :key="`${i}-${seg}`"
      class="vel-tanim__seg"
      :class="{ 'vel-tanim__seg--space': /^\s+$/.test(seg) }"
      :style="{ '--vel-tanim-i': i }"
      aria-hidden="true"
    >{{ seg }}</span>
  </component>
</template>

<style scoped>
.vel-tanim {
  margin: 0;
}

.vel-tanim__seg {
  display: inline-block;
  white-space: pre;
  animation: vel-tanim-fade var(--vel-tanim-dur, 420ms) cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(
    var(--vel-tanim-delay, 40ms) + var(--vel-tanim-i, 0) * var(--vel-tanim-stagger, 48ms)
  );
}

.vel-tanim--blur .vel-tanim__seg {
  animation-name: vel-tanim-blur;
}

.vel-tanim--blurUp .vel-tanim__seg {
  animation-name: vel-tanim-blur-up;
}

@keyframes vel-tanim-fade {
  from {
    opacity: 0;
    transform: translateY(0.45em);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-tanim-blur {
  from {
    opacity: 0;
    filter: blur(8px);
  }

  to {
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes vel-tanim-blur-up {
  from {
    opacity: 0;
    filter: blur(10px);
    transform: translateY(0.55em);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-tanim__seg {
    animation: none;
    opacity: 1;
    filter: none;
    transform: none;
  }
}
</style>
