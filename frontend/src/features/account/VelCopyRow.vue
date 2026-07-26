<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Строка реквизита: подпись + значение + «Copia».
 *
 * Длинный IBAN не должен «съезжать» с кнопкой. На узком экране:
 *   label
 *   value (wrap)
 *   [    Copia    ]  — full-width, ≥44px по высоте (WCAG 2.5.5)
 * На шире — value слева, Copia справа в одной полосе.
 */
const props = defineProps<{
  label: string
  value: string
  /** mono display (IBAN / SWIFT) */
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
    /* fallback: select + execCommand не тащим — clipboard API достаточно */
    return
  }
  justCopied.value = true
  clearCopied()
}
</script>

<template>
  <div
    class="vel-copy"
    :class="{ 'vel-copy--mono': mono, 'vel-copy--ok': justCopied }"
  >
    <div class="vel-copy__text">
      <p class="vel-copy__label">{{ label }}</p>
      <p class="vel-copy__value" :class="{ 'vel-num': mono }">{{ value }}</p>
    </div>

    <VelButton
      type="button"
      variant="outline"
      size="md"
      class="vel-copy__btn"
      :disabled="!isSupported"
      :aria-label="`${copyLabel}: ${label}`"
      data-testid="copy-row-btn"
      @click="onCopy"
    >
      <span class="vel-copy__btn-icon" aria-hidden="true">
        {{ justCopied ? '✓' : '⧉' }}
      </span>
      {{ copyLabel }}
    </VelButton>
  </div>
</template>

<style scoped>
.vel-copy {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
  padding: 0.85rem 0;
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
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vel-copy__value {
  margin: 0.2rem 0 0;
  color: var(--color-fg);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
  /* Длинный IBAN: перенос по символам, без вылезания за карточку */
  overflow-wrap: anywhere;
  word-break: break-word;
}

.vel-copy--mono .vel-copy__value {
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

/*
 * Кнопка копирования: всегда ≥44×44, на мобилке на всю ширину —
 * палец попадает без промаха (WCAG 2.5.5 Target Size).
 */
.vel-copy__btn {
  flex: 0 0 auto;
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
  width: 100%;
  gap: 0.4rem;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.vel-copy__btn-icon {
  display: inline-flex;
  width: 1.1rem;
  justify-content: center;
  font-size: 0.95rem;
  line-height: 1;
  opacity: 0.85;
}

.vel-copy--ok .vel-copy__btn {
  border-color: color-mix(in oklab, var(--color-success) 55%, var(--color-line));
  color: var(--color-success);
}

/* ≥480px: label+value слева, Copia справа — если место есть */
@media (min-width: 30rem) {
  .vel-copy {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .vel-copy__btn {
    width: auto;
    min-inline-size: 6.5rem;
    padding-inline: 1rem;
  }

  /*
   * Длинный mono (IBAN): value может занять 2+ строки —
   * кнопка сверху справа, value на всю ширину под label.
   */
  .vel-copy--mono {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .vel-copy--mono .vel-copy__text {
    flex: 1 1 calc(100% - 7.5rem);
    min-inline-size: min(100%, 12rem);
  }

  .vel-copy--mono .vel-copy__btn {
    margin-block-start: 0.1rem;
  }
}

/* Очень узкие телефоны: кнопка крупнее, текст чуть плотнее */
@media (max-width: 22.5rem) {
  .vel-copy__value {
    font-size: 0.88rem;
  }

  .vel-copy__btn {
    min-block-size: 3rem;
    font-size: 0.95rem;
  }
}
</style>
