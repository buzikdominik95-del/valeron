<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

/**
 * Строка реквизита: label + value + иконка копирования в одной строке
 * (без широкой кнопки «Copia» на всю ширину).
 */
const props = defineProps<{
  label: string
  value: string
  mono?: boolean
}>()

const { t } = useI18n()
const { copy, isSupported } = useClipboard()
const justCopied = ref(false)

const { start: clearCopied } = useTimeoutFn(
  () => {
    justCopied.value = false
  },
  1600,
  { immediate: false },
)

const copyLabel = computed(() =>
  justCopied.value ? t('account.payment.copied') : t('account.payment.copy'),
)

async function onCopy(): Promise<void> {
  if (!isSupported.value) return
  try {
    await copy(props.value)
  } catch {
    return
  }
  justCopied.value = true
  clearCopied()
}
</script>

<template>
  <div class="vel-copy" :class="{ 'vel-copy--mono': mono, 'vel-copy--ok': justCopied }">
    <div class="vel-copy__text">
      <p class="vel-copy__label">{{ label }}</p>
      <p class="vel-copy__value" :class="{ 'vel-num': mono }">{{ value }}</p>
    </div>

    <button
      type="button"
      class="vel-copy__icon"
      :disabled="!isSupported"
      :aria-label="`${copyLabel}: ${label}`"
      :title="copyLabel"
      data-testid="copy-row-btn"
      @click="onCopy"
    >
      <svg v-if="!justCopied" class="vel-copy__svg" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      <svg v-else class="vel-copy__svg vel-copy__svg--ok" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.vel-copy {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.7rem 0;
  border-block-end: 1px solid var(--color-line);
}

.vel-copy:last-child {
  border-block-end: none;
}

.vel-copy__text {
  min-inline-size: 0;
  flex: 1 1 auto;
}

.vel-copy__label {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vel-copy__value {
  margin: 0.15rem 0 0;
  color: var(--color-fg);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.vel-copy--mono .vel-copy__value {
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

/* Иконка-копирка: 44×44 hit area, без полной кнопки «Copia» */
.vel-copy__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-block-start: 0.05rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-accent-deep);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.vel-copy__icon:hover:not(:disabled) {
  background: var(--color-raised);
}

.vel-copy__icon:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.vel-copy__svg {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-copy--ok .vel-copy__icon {
  color: var(--color-success);
}
</style>
