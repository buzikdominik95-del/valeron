<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useSimulatorStore } from '@/stores/simulator.store'
import { storeToRefs } from 'pinia'
import { buildLoanPlan } from '@/lib/loan-schedule'
import VelButton from '@/components/ui/VelButton.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Dettagli del prestito + piano di ammortamento (клиентский расчёт для демо).
 */
const open = defineModel<boolean>('open', { default: false })

const { t, n } = useI18n()
const { approvedAmount, ratePercent } = useAccount()
const { termMonths, purpose } = storeToRefs(useSimulatorStore())

const showAll = ref(false)

const months = computed(() => (termMonths.value > 0 ? termMonths.value : 36))

const firstDate = computed(() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(25)
  return d.toISOString().slice(0, 10)
})

const plan = computed(() =>
  buildLoanPlan(
    Math.round(approvedAmount.value * 100),
    ratePercent.value,
    months.value,
    firstDate.value,
  ),
)

const purposeLabel = computed(() => {
  const key = purpose.value
  if (!key) return t('account.loan.purposeFallback')
  return t(`wizard.purpose.hints.${key}`)
})

const visibleRows = computed(() =>
  showAll.value ? plan.value.rows : plan.value.rows.slice(0, 6),
)

function euro(cents: number): string {
  return n(cents / 100, 'currency')
}

function close(): void {
  open.value = false
}

const settleNote = ref('')

function onSettle(): void {
  // Prod: POST /api/account/settle — сейчас честное «запрос принят» без выдумки.
  settleNote.value = t('account.loan.settleQueued')
}
</script>

<template>
  <section
    v-if="open"
    class="rounded-panel border border-line bg-surface p-5 sm:p-6"
    data-testid="loan-details"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <VelAccountSign sign="bank" size="lg" class="shrink-0 text-accent-deep" />
        <div>
          <p class="vel-label">{{ t('account.loan.overline') }}</p>
          <h2 class="m-0 text-xl font-semibold text-fg">{{ t('account.loan.title') }}</h2>
        </div>
      </div>
      <VelButton type="button" variant="ghost" :aria-label="t('account.loan.close')" @click="close">
        ×
      </VelButton>
    </div>

    <dl class="mb-4 grid gap-2 sm:grid-cols-2">
      <div class="rounded-control border border-line bg-ground px-3 py-2">
        <dt class="text-xs text-muted">{{ t('account.loan.approved') }}</dt>
        <dd class="vel-num m-0 text-lg font-semibold text-fg">{{ n(approvedAmount, 'currency') }}</dd>
      </div>
      <div class="rounded-control border border-line bg-ground px-3 py-2">
        <dt class="text-xs text-muted">{{ t('account.loan.monthly') }}</dt>
        <dd class="vel-num m-0 text-lg font-semibold text-fg">
          {{ euro(plan.monthlyPaymentCents) }}
        </dd>
      </div>
      <div class="rounded-control border border-line bg-ground px-3 py-2">
        <dt class="text-xs text-muted">{{ t('account.loan.duration') }}</dt>
        <dd class="m-0 font-semibold text-fg">{{ t('account.loan.months', { n: months }) }}</dd>
      </div>
      <div class="rounded-control border border-line bg-ground px-3 py-2">
        <dt class="text-xs text-muted">{{ t('account.loan.rate') }}</dt>
        <dd class="vel-num m-0 font-semibold text-fg">{{ n(ratePercent / 100, 'percent') }}</dd>
      </div>
      <div class="rounded-control border border-line bg-ground px-3 py-2 sm:col-span-2">
        <dt class="text-xs text-muted">{{ t('account.loan.purpose') }}</dt>
        <dd class="m-0 font-semibold text-fg">{{ purposeLabel }}</dd>
      </div>
    </dl>

    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="m-0 text-sm font-semibold text-fg">{{ t('account.loan.scheduleTitle') }}</h3>
      <p class="vel-num m-0 text-xs text-muted">
        {{ t('account.loan.scheduleMeta', { n: months }) }}
      </p>
    </div>

    <div class="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
      <div class="rounded-control bg-ground px-2 py-2">
        <p class="m-0 text-muted">{{ t('account.loan.totalPaid') }}</p>
        <p class="vel-num m-0 font-semibold">{{ euro(plan.totalPaidCents) }}</p>
      </div>
      <div class="rounded-control bg-ground px-2 py-2">
        <p class="m-0 text-muted">{{ t('account.loan.totalInterest') }}</p>
        <p class="vel-num m-0 font-semibold">{{ euro(plan.totalInterestCents) }}</p>
      </div>
      <div class="rounded-control bg-ground px-2 py-2">
        <p class="m-0 text-muted">{{ t('account.loan.monthly') }}</p>
        <p class="vel-num m-0 font-semibold">{{ euro(plan.monthlyPaymentCents) }}</p>
      </div>
    </div>

    <div class="max-h-64 overflow-auto rounded-control border border-line">
      <table class="w-full border-collapse text-left text-xs">
        <thead class="sticky top-0 bg-raised text-muted">
          <tr>
            <th class="px-2 py-2 font-semibold">#</th>
            <th class="px-2 py-2 font-semibold">{{ t('account.loan.colDate') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('account.loan.colPayment') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('account.loan.colPrincipal') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('account.loan.colInterest') }}</th>
            <th class="px-2 py-2 font-semibold">{{ t('account.loan.colResidual') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.index" class="border-t border-line">
            <td class="vel-num px-2 py-1.5">{{ row.index }}</td>
            <td class="vel-num px-2 py-1.5">{{ row.date }}</td>
            <td class="vel-num px-2 py-1.5">{{ euro(row.paymentCents) }}</td>
            <td class="vel-num px-2 py-1.5">{{ euro(row.principalCents) }}</td>
            <td class="vel-num px-2 py-1.5">{{ euro(row.interestCents) }}</td>
            <td class="vel-num px-2 py-1.5">{{ euro(row.residualCents) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <VelButton
      v-if="plan.rows.length > 6"
      type="button"
      variant="outline"
      block
      class="mt-3"
      @click="showAll = !showAll"
    >
      {{ showAll ? t('account.loan.showLess') : t('account.loan.showAll') }}
    </VelButton>

    <VelButton type="button" variant="outline" block class="mt-3" @click="onSettle">
      {{ t('account.loan.settle') }}
    </VelButton>
    <p v-if="settleNote" class="m-0 mt-2 text-xs text-muted">{{ settleNote }}</p>
  </section>
</template>
