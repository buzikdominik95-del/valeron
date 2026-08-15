<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useAccount } from '@/composables/useAccount'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import VelButton from '@/components/ui/VelButton.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelSupportFab from '@/features/account/VelSupportFab.vue'

/**
 * Выбор суммы вывода (ползунок) перед комиссией.
 * После подтверждения — 2-шаговый оверлей комиссии/реквизитов.
 *
 * При открытии блоки формы выезжают очередью — иначе диалог «вспыхивает»
 * одним куском поверх затемнения.
 */
const open = defineModel<boolean>('open', { default: false })
const amount = defineModel<number>('amount', { default: 0 })

const emit = defineEmits<{ confirm: [euros: number] }>()

const { t, n } = useI18n()
const { approvedAmount, loanBalanceEuros } = useAccount()

const uid = useId()
const titleId = `vel-wd-amount-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const formRoot = useTemplateRef<HTMLElement>('formRoot')
useNativeDialog(dialog, open)

useStaggerReveal(formRoot, {
  y: 14,
  stagger: 0.065,
  duration: 0.38,
  delay: 0.04,
  replayOn: open,
})

const minEuro = 100
/** Max = полный баланс (с fee), как на карточке / L4 anim. */
const maxEuro = computed(() => {
  const bal = Math.round(loanBalanceEuros.value)
  if (bal > 0) return Math.max(minEuro, bal)
  const approved = Math.round(approvedAmount.value)
  return Math.max(minEuro, approved > 0 ? approved : minEuro)
})
const local = ref(maxEuro.value)

watch(maxEuro, (max) => {
  if (local.value > max) local.value = max
})

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
    <form ref="formRoot" class="vel-wd__form" @submit.prevent="onConfirm">
      <div data-reveal class="flex items-start gap-3">
        <VelAccountSign sign="bank" size="lg" class="shrink-0 text-accent-deep" />
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.withdrawAmount.overline') }}</p>
          <h2 :id="titleId" class="m-0 text-xl font-semibold text-fg">
            {{ t('account.withdrawAmount.title') }}
          </h2>
        </div>
      </div>

      <p data-reveal class="m-0 text-sm text-muted">{{ t('account.withdrawAmount.lead') }}</p>

      <p data-reveal class="vel-num m-0 text-center text-3xl font-bold text-accent-deep">
        {{ amountText }}
      </p>

      <div data-reveal class="flex flex-col gap-2">
        <VelRange
          v-model="local"
          :min="minEuro"
          :max="maxEuro"
          :step="1"
          :progress="progress"
          :label="t('account.withdrawAmount.title')"
          :value-text="amountText"
        />

        <div class="vel-num flex justify-between text-xs text-muted">
          <span>{{ minText }}</span>
          <span>{{ maxText }}</span>
        </div>
      </div>

      <div data-reveal>
        <VelButton type="submit" block size="lg" data-testid="withdraw-amount-confirm">
          {{ t('account.withdrawAmount.cta') }}
        </VelButton>
      </div>

      <VelSupportFab v-if="open" />
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.5rem;
}
</style>
