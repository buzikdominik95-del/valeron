<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Знак Velora: «V», у которой правый штрих уходит вверх с превышением —
 * читается как рост и остаётся различимым в 16 пикселях.
 * Два оттенка синего: тяжёлый на опоре, яркий на восходящем штрихе.
 */
interface Props {
  /** Только знак, без надписи — для узких мест. */
  markOnly?: boolean
  /** Крупная подача для подвала и обложек. */
  large?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  markOnly: false,
  large: false,
})

const { t } = useI18n()

const wordClass = computed(() =>
  props.large ? 'vel-logo__word vel-logo__word--large' : 'vel-logo__word',
)
</script>

<template>
  <span class="vel-logo" :class="{ 'vel-logo--large': large }">
    <svg class="vel-logo__mark" viewBox="0 0 32 32" role="img" :aria-label="t('brand.name')">
      <path class="vel-logo__base" d="M4 6 L14.5 26.5" />
      <path class="vel-logo__rise" d="M14.5 26.5 L28 3.5" />
    </svg>

    <span v-if="!markOnly" :class="wordClass">{{ t('brand.name') }}</span>
  </span>
</template>

<style scoped>
.vel-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.vel-logo__mark {
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  fill: none;
  stroke-linecap: butt;
  stroke-width: 4.2;
}

.vel-logo--large .vel-logo__mark {
  width: 2.5rem;
  height: 2.5rem;
}

.vel-logo__base {
  stroke: var(--color-accent-deep);
}

.vel-logo__rise {
  stroke: var(--color-accent);
}

.vel-logo__word {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  color: var(--color-accent-deep);
}

.vel-logo__word--large {
  font-size: 1.9rem;
}
</style>
