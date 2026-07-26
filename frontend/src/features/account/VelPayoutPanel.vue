<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMaskedInput } from '@/composables/useMaskedInput'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { ibanExpectedLength, isValidIban, maskIban } from '@/lib/iban'
import type { PayoutMethod } from '@/api/account.api'
import { HOLDER_MIN_LENGTH, PAYOUT_ACCOUNT_RULES } from '@/features/account/payout-fields'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelRange from '@/components/ui/VelRange.vue'
import VelPayoutMethods from '@/features/account/VelPayoutMethods.vue'

/**
 * Выпадающая панель под балансом (как Calipso): метод + IBAN + сумма + Avvia.
 * Не модалка — раскрывается после Preleva, кнопка Preleva при этом гаснет.
 */
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ submitted: [euros: number]; close: [] }>()

const { t, n } = useI18n()
const { approvedAmount, canWithdraw, isAuthorizing } = useAccount()
const accountStore = useAccountStore()

const uid = useId()
const titleId = `vel-payout-panel-${uid}`

const method = ref<PayoutMethod>('iban')
const accountValue = ref('')
const holder = ref('')
const minEuro = 100
const maxEuro = computed(() => Math.max(minEuro, Math.round(approvedAmount.value)))
const amountEuro = ref(maxEuro.value)

const rule = computed(() => PAYOUT_ACCOUNT_RULES[method.value])
const accountInput = useTemplateRef<ComponentPublicInstance>('accountInput')

const { raw: accountRaw } = useMaskedInput(() => accountInput.value, {
  model: accountValue,
  maxLength: () => rule.value.max,
  allow: () => rule.value.allow,
  upper: () => rule.value.upper,
})

watch(method, () => {
  accountValue.value = ''
})

watch(open, (isOpen) => {
  if (!isOpen) return
  amountEuro.value = maxEuro.value
})

const amountText = computed(() => n(amountEuro.value, 'currency'))
const maxText = computed(() => n(maxEuro.value, 'currency'))
const amountProgress = computed(() => {
  const span = maxEuro.value - minEuro
  if (span <= 0) return 1
  return (amountEuro.value - minEuro) / span
})
const percentText = computed(() =>
  n(amountProgress.value, { style: 'percent', maximumFractionDigits: 0 }),
)

const accountLabel = computed(() => t(`account.payout.dialog.fields.${method.value}`))
const accountHint = computed(() =>
  t(`account.payout.dialog.hints.${method.value}`, {
    min: rule.value.min,
    max: rule.value.max,
  }),
)

const accountReady = computed(() => {
  if (accountStore.ibanProvided && accountRaw.value === '') return true
  if (accountRaw.value.length < rule.value.min) return false
  return method.value === 'iban' ? isValidIban(accountRaw.value) : true
})

const holderReady = computed(
  () => accountStore.ibanProvided || holder.value.trim().length >= HOLDER_MIN_LENGTH,
)

const canSubmit = computed(
  () => canWithdraw.value && !isAuthorizing.value && accountReady.value && holderReady.value,
)

const accountError = computed(() => {
  if (method.value !== 'iban' || accountRaw.value === '') return null
  const expected = ibanExpectedLength(accountRaw.value) ?? rule.value.min
  if (accountRaw.value.length < expected) return null
  return accountReady.value ? null : t('account.payout.dialog.errors.iban')
})

const blockedReason = computed(() =>
  isAuthorizing.value ? t('account.payout.inProgress') : t('account.payout.dialog.incomplete'),
)

function submit(): void {
  if (!canSubmit.value) return
  if (accountRaw.value !== '') {
    accountStore.setIbanMasked(maskIban(accountRaw.value))
  } else if (!accountStore.ibanProvided) {
    accountStore.ibanProvided = true
  }
  const euros = amountEuro.value
  accountValue.value = ''
  holder.value = ''
  open.value = false
  emit('submitted', euros)
}

function close(): void {
  open.value = false
  emit('close')
}
</script>

<template>
  <section
    v-if="open"
    class="vel-ppanel"
    :aria-labelledby="titleId"
    data-testid="payout-panel"
  >
    <header class="vel-ppanel__head">
      <div class="min-w-0">
        <h2 :id="titleId" class="vel-ppanel__title">
          {{ t('account.payout.dialog.title') }}
        </h2>
        <p class="vel-ppanel__lead">{{ t('account.payout.dialog.lead') }}</p>
      </div>
      <button
        type="button"
        class="vel-ppanel__x"
        :aria-label="t('account.payout.dialog.close')"
        @click="close"
      >
        ×
      </button>
    </header>

    <form class="vel-ppanel__form" @submit.prevent="submit">
      <VelPayoutMethods v-model="method" layout="tiles" />

      <VelField :label="accountLabel" :hint="accountHint" :error="accountError ?? undefined">
        <VelInput
          ref="accountInput"
          v-model="accountValue"
          :inputmode="rule.inputMode"
          :autocomplete="rule.autocomplete"
          spellcheck="false"
        />
      </VelField>

      <VelField :label="t('account.payout.dialog.fields.holder')">
        <VelInput
          v-model="holder"
          :placeholder="t('account.payout.dialog.holderPlaceholder')"
          :autocomplete="rule.holderAutocomplete"
          spellcheck="false"
        />
      </VelField>

      <div class="vel-ppanel__amount">
        <p class="vel-label m-0">{{ t('account.payout.dialog.amountLabel') }}</p>
        <p class="vel-num vel-ppanel__sum m-0">
          {{ amountText }}
          <span class="vel-ppanel__max">/ {{ maxText }}</span>
        </p>
        <p class="m-0 text-xs font-semibold text-accent-deep">
          {{ t('account.payout.dialog.amountShare', { percent: percentText }) }}
        </p>
        <VelRange
          v-model="amountEuro"
          :min="minEuro"
          :max="maxEuro"
          :step="100"
          :progress="amountProgress"
          :label="t('account.payout.dialog.amountLabel')"
          :value-text="amountText"
        />
      </div>

      <p v-if="!canSubmit" class="m-0 text-xs text-muted">{{ blockedReason }}</p>

      <VelButton type="submit" size="lg" block :disabled="!canSubmit">
        {{ t('account.payout.dialog.submit') }}
        <span aria-hidden="true">→</span>
      </VelButton>
    </form>
  </section>
</template>

<style scoped>
.vel-ppanel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.15rem 1.2rem 1.25rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow: 0 0.75rem 1.75rem color-mix(in oklab, var(--color-fg) 7%, transparent);
  animation: vel-ppanel-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-ppanel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.vel-ppanel__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-fg);
}

.vel-ppanel__lead {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.vel-ppanel__x {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  color: var(--color-muted);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.vel-ppanel__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.vel-ppanel__amount {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 25%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-accent) 6%, var(--color-ground));
}

.vel-ppanel__sum {
  color: var(--color-accent-deep);
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.vel-ppanel__max {
  margin-left: 0.25rem;
  color: var(--color-muted);
  font-size: 0.95rem;
  font-weight: 600;
}

@keyframes vel-ppanel-in {
  from {
    opacity: 0;
    transform: translateY(-0.65rem) scale(0.985);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-ppanel {
    animation: none;
  }
}
</style>
