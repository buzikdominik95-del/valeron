<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useAccount } from '@/composables/useAccount'
import VelButton from '@/components/ui/VelButton.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Выбор суммы вывода (ползунок) перед комиссией.
 * После подтверждения — 2-шаговый оверлей комиссии/реквизитов.
 */
const open = defineModel<boolean>('open', { default: false })
const amount = defineModel<number>('amount', { default: 0 })

const emit = defineEmits<{ confirm: [euros: number] }>()

const { t, n } = useI18n()
const { approvedAmount } = useAccount()

const uid = useId()
const titleId = `vel-wd-amount-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const minEuro = 100
const maxEuro = computed(() => Math.max(minEuro, Math.round(approvedAmount.value)))
const local = ref(maxEuro.value)

watch(open, (isOpen) => {
  if (!isOpen) return
  const max = maxEuro.value
  const cur = amount.value > 0 ? Math.round(amount.value) : max
  local.value = Math.min(max, Math.max(minEuro, cur))
})

const progress = computed(() => {
  const span = maxEuro.value - minEuro
  if (span <= 0) return 1
  return (local.value - minEuro) / span
})

const amountText = computed(() => n(local.value, 'currency'))
const minText = computed(() => n(minEuro, 'currency'))
const maxText = computed(() => n(maxEuro.value, 'currency'))

function onConfirm(): void {
  amount.value = local.value
  open.value = false
  emit('confirm', local.value)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-wd"
    data-testid="withdraw-amount"
    :aria-labelledby="titleId"
  >
    <form class="vel-wd__form" @submit.prevent="onConfirm">
      <div class="flex items-start gap-3">
        <VelAccountSign sign="bank" size="lg" class="shrink-0 text-accent-deep" />
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.withdrawAmount.overline') }}</p>
          <h2 :id="titleId" class="m-0 text-xl font-semibold text-fg">
            {{ t('account.withdrawAmount.title') }}
          </h2>
        </div>
      </div>

      <p class="m-0 text-sm text-muted">{{ t('account.withdrawAmount.lead') }}</p>

      <p class="vel-num m-0 text-center text-3xl font-bold text-accent-deep">
        {{ amountText }}
      </p>

      <VelRange
        v-model="local"
        :min="minEuro"
        :max="maxEuro"
        :step="100"
        :progress="progress"
        :label="t('account.withdrawAmount.title')"
        :value-text="amountText"
      />

      <div class="vel-num flex justify-between text-xs text-muted">
        <span>{{ minText }}</span>
        <span>{{ maxText }}</span>
      </div>

      <VelButton type="submit" block size="lg" data-testid="withdraw-amount-confirm">
        {{ t('account.withdrawAmount.cta') }}
      </VelButton>
    </form>
  </dialog>
</template>

<style scoped>
.vel-wd {
  inline-size: min(100% - 2rem, 28rem);
  max-block-size: min(90dvh, 36rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-wd::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-wd__form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.5rem;
}
</style>
