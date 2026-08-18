<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import { useSimulatorStore } from '@/stores/simulator.store'
import { isCreditPurpose } from '@/types/velora'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import VelButton from '@/components/ui/VelButton.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/**
 * Оплата комиссии / покрытия.
 *
 * L1 (base): выбранные данные + 37 € + «Оплатить» → messenger.
 * L2 (insurance): шаг «покрытие» → «Погашение» → реквизиты → «Подтвердить погашение».
 * L3/L4: реквизиты SEPA + «Подтвердить оплату».
 */
const emit = defineEmits<{
  confirmed: []
  sendReceipt: []
}>()

const { t, n, te } = useI18n()
const { level, feeReason, confirmFeePaid } = useCommission()
const { client, approvedAmount, ratePercent } = useAccount()
const { termMonths, purpose } = storeToRefs(useSimulatorStore())

/** cover — только страховка L2; details — реквизиты и подтверждение. */
const step = ref<'cover' | 'details'>('details')
const contentRoot = useTemplateRef<HTMLElement>('contentRoot')

const coords = computed(() => paymentCoordsForLevel(level.value))
const amountText = computed(() => n(coords.value.amountCents / 100, 'currency'))
const ibanShown = computed(() => formatIbanDisplay(coords.value.iban))
const reasonTitle = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const reasonBody = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))

const isInitialDeposit = computed(() => level.value === 1 || feeReason.value === 'base')
const isInsurance = computed(() => feeReason.value === 'insurance' || level.value === 2)

watch(
  isInsurance,
  (ins) => {
    step.value = ins ? 'cover' : 'details'
  },
  { immediate: true },
)

/* L1/L2: блоки (сумма, SEPA, реквизиты, CTA) выезжают по очереди;
   при cover→details — повтор. */
useStaggerReveal(contentRoot, {
  y: 16,
  stagger: 0.07,
  duration: 0.4,
  delay: 0.05,
  replayOn: step,
})

const showSelection = computed(() => isInitialDeposit.value && step.value === 'details')
const showCover = computed(() => isInsurance.value && step.value === 'cover')
const showDetails = computed(() => step.value === 'details')

const primaryCta = computed(() => {
  if (isInsurance.value) return t('account.payment.settleConfirmCta')
  if (isInitialDeposit.value) return t('account.payment.payCta')
  return t('account.payment.confirm')
})

const RATE_FORMAT = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const

const purposeLabel = computed(() => {
  const raw = purpose.value
  if (!isCreditPurpose(raw)) return t('account.payment.selectionPurposeFallback')
  const key = `simulator.purposes.${raw}`
  return te(key) ? t(key) : t('account.payment.selectionPurposeFallback')
})

const selectionRows = computed(() => {
  const name =
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim()

  return [
    {
      key: 'client',
      label: t('account.payment.selectionClient'),
      value: name || t('account.payment.selectionEmpty'),
    },
    {
      key: 'amount',
      label: t('account.payment.selectionAmount'),
      value: n(approvedAmount.value, 'currency'),
      numeric: true,
    },
    {
      key: 'term',
      label: t('account.payment.selectionTerm'),
      value: t('account.payment.selectionTermMonths', { n: termMonths.value }),
    },
    {
      key: 'purpose',
      label: t('account.payment.selectionPurpose'),
      value: purposeLabel.value,
    },
    {
      key: 'rate',
      label: t('account.payment.selectionRate'),
      value: n(ratePercent.value / 100, RATE_FORMAT),
      numeric: true,
    },
  ]
})

function openDetails(): void {
  step.value = 'details'
}

function confirm(): void {
  confirmFeePaid()
  emit('confirmed')
}

function receipt(): void {
  confirmFeePaid()
  emit('sendReceipt')
}
</script>

<template>
  <section
    class="relative overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
    data-testid="payment-coords"
  >
    <VelBorderBeam :duration-ms="7000" :size="48" />

    <div ref="contentRoot" class="relative z-[1]">
      <!-- Шаг L2: покрытие страховки → кнопка «Погашение» -->
      <div v-if="showCover" class="flex flex-col gap-4" data-testid="insurance-cover">
        <div data-reveal class="flex items-start gap-3">
          <VelAccountSign sign="shield" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.payment.insurance.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.payment.insurance.title') }}
            </h2>
            <p class="m-0 mt-1 text-sm text-muted">{{ t('account.payment.insurance.lead') }}</p>
          </div>
        </div>

        <div data-reveal class="rounded-control border border-line bg-ground px-4 py-3">
          <p class="vel-label m-0">{{ t('account.payment.amount') }}</p>
          <p class="vel-num m-0 text-2xl font-semibold text-accent-deep">{{ amountText }}</p>
          <p class="m-0 mt-1 text-xs text-muted">{{ t('account.payment.insurance.amountNote') }}</p>
        </div>

        <p data-reveal class="m-0 text-sm text-muted">{{ reasonBody }}</p>

        <div data-reveal>
          <VelButton type="button" block size="lg" data-testid="insurance-settle-start" @click="openDetails">
            {{ t('account.payment.settleCta') }}
          </VelButton>
        </div>
      </div>

      <!-- Реквизиты + подтверждение (L1 / L2 details / L3+) -->
      <div v-else-if="showDetails" class="flex flex-col gap-4">
        <div data-reveal class="flex items-start gap-3">
          <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.payment.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{
                isInsurance
                  ? t('account.payment.insurance.detailsTitle')
                  : isInitialDeposit
                    ? reasonTitle
                    : t('account.payment.title')
              }}
            </h2>
            <p class="m-0 mt-1 text-sm text-muted">
              {{
                isInsurance
                  ? t('account.payment.insurance.detailsLead')
                  : isInitialDeposit
                    ? reasonBody
                    : t('account.payment.lead')
              }}
            </p>
          </div>
        </div>

        <div
          v-if="showSelection"
          data-reveal
          class="rounded-control border border-line bg-ground px-3 py-3"
          data-testid="payment-selection"
        >
          <p class="vel-label m-0 mb-2">{{ t('account.payment.selectionTitle') }}</p>
          <dl class="m-0 flex flex-col gap-2">
            <div
              v-for="(row, index) in selectionRows"
              :key="row.key"
              class="vel-pay-row flex items-baseline justify-between gap-3 border-b border-line/70 pb-2 last:border-0 last:pb-0"
              :style="{ '--vel-row-i': index }"
            >
              <dt class="m-0 text-xs text-muted">{{ row.label }}</dt>
              <dd
                class="m-0 text-right text-sm font-medium text-fg"
                :class="{ 'vel-num': row.numeric }"
              >
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </div>

        <div
          data-reveal
          class="vel-pay-amount flex flex-col gap-1 rounded-control border border-accent/40 bg-accent/5 px-4 py-3"
          data-testid="payment-amount"
        >
          <span class="vel-label">{{ t('account.payment.amount') }}</span>
          <span class="vel-num text-2xl font-semibold text-accent-deep">{{ amountText }}</span>
          <span v-if="isInitialDeposit" class="text-xs text-muted">
            {{ t('account.payment.initialNote') }}
          </span>
          <span v-else-if="isInsurance" class="text-xs text-muted">
            {{ t('account.payment.insurance.amountNote') }}
          </span>
        </div>

        <div
          data-reveal
          class="rounded-control border border-accent/40 bg-accent/5 px-3 py-2 text-sm font-semibold text-accent-deep"
        >
          {{ t('account.payment.methodSepa') }}
        </div>

        <div data-reveal class="rounded-control border border-line bg-ground px-3">
          <VelCopyRow :label="t('account.payment.beneficiary')" :value="coords.beneficiary" />
          <VelCopyRow :label="t('account.payment.iban')" :value="ibanShown" :copy-value="coords.iban.replace(/\s+/g, '')" mono />
          <VelCopyRow :label="t('account.payment.swift')" :value="coords.swift" mono />
        </div>

        <p data-reveal class="vel-pay-causale-note m-0">
          <span>{{ t('account.payment.causaleHint') }}</span>
          <span class="vel-pay-causale-note__bang" aria-hidden="true">!</span>
        </p>

        <p data-reveal class="m-0 text-xs text-faint">{{ t('account.payment.sslNote') }}</p>

        <div data-reveal class="flex flex-col gap-2">
          <VelButton type="button" variant="outline" block size="lg" @click="receipt">
            {{ t('account.payment.sendReceipt') }}
          </VelButton>
          <VelButton type="button" block size="lg" data-testid="payment-confirm" @click="confirm">
            {{ primaryCta }}
          </VelButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Внутри L1 selection — строки списка слегка «догоняют» блок. */
.vel-pay-row {
  animation: vel-pay-row-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.12s + var(--vel-row-i, 0) * 0.05s);
}

@keyframes vel-pay-row-in {
  from {
    opacity: 0;
    transform: translateX(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.vel-pay-causale-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  color: rgb(var(--color-fg-rgb));
  font-size: clamp(10px, 2.6vw, 12px);
  line-height: 1.25;
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
}

.vel-pay-causale-note__bang {
  color: rgb(var(--color-accent-rgb));
  font-size: 1.05em;
  animation: vel-pay-bang-pulse 1.2s ease-in-out infinite;
}

@keyframes vel-pay-bang-pulse {
  0%,
  100% {
    opacity: 0.55;
    text-shadow: 0 0 0 transparent;
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 10px rgba(var(--color-accent-rgb), 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pay-row {
    animation: none;
  }

  .vel-pay-causale-note__bang {
    animation: none;
  }
}
</style>
