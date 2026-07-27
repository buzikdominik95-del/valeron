<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useAccountStore } from '@/stores/account.store'
import { COMMISSION_FEE_BY_LEVEL } from '@/api/commission'
import { buildLoanPlan } from '@/lib/loan-schedule'
import VelButton from '@/components/ui/VelButton.vue'
import VelPersonalData from '@/features/account/VelPersonalData.vue'

/**
 * Prestito (кнопка на карточке баланса):
 * модалка с двумя блоками, как на старом проде:
 *  1) Dati personali
 *  2) Piano di ammortamento (таблица rate)
 */
const open = defineModel<boolean>('open', { default: false })

const { t, n } = useI18n()
const { approvedAmount, ratePercent } = useAccount()
const { level } = useCommission()
const accountStore = useAccountStore()
const { paidCommissionExpenses } = storeToRefs(accountStore)
const { termMonths, purpose } = storeToRefs(useSimulatorStore())

const uid = useId()
const titleId = `vel-loan-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const showAll = ref(false)

const months = computed(() => (termMonths.value > 0 ? termMonths.value : 36))

const firstDate = computed(() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(25)
  return d.toISOString().slice(0, 10)
})

/** Та же сумма, что на карточке баланса: одобрено + оплаченные комиссии. */
const loanPrincipalCents = computed(() => {
  let cents = Math.round(approvedAmount.value * 100)
  for (const exp of paidCommissionExpenses.value) {
    cents += exp.amountCents
  }
  /* Fallback: level-based, если запись оплаты ещё не пришла, а этап уже выше. */
  if (paidCommissionExpenses.value.length === 0) {
    if (level.value >= 2) cents += COMMISSION_FEE_BY_LEVEL[1].amountCents
    if (level.value >= 3) cents += COMMISSION_FEE_BY_LEVEL[2].amountCents
  }
  return cents
})

const plan = computed(() =>
  buildLoanPlan(loanPrincipalCents.value, ratePercent.value, months.value, firstDate.value),
)

const purposeLabel = computed(() => {
  const key = purpose.value
  if (!key) return t('account.loan.purposeFallback')
  return t(`wizard.purpose.hints.${key}`)
})

type ScheduleViewRow = {
  key: string
  index: number
  date: string
  paymentCents: number
  principalCents: number
  interestCents: number
  residualCents: number
}

/**
 * Rate + в конце оплаченные комиссии как обычные строки графика
 * (тот же стиль: N, data, rata, capitale, interessi, residuo).
 * N комиссии = lastInstallment + 1… (после 34-й rate → 35-я, не «прыжок» на 37).
 */
const allScheduleRows = computed<ScheduleViewRow[]>(() => {
  const installments = plan.value.rows.map((row) => ({
    key: `r-${row.index}`,
    index: row.index,
    date: row.date,
    paymentCents: row.paymentCents,
    principalCents: row.principalCents,
    interestCents: row.interestCents,
    residualCents: row.residualCents,
  }))

  const base = installments.length
  const fees = paidCommissionExpenses.value.map((exp, i) => ({
    key: `fee-${exp.level}`,
    index: base + i + 1,
    date: exp.paidAt,
    paymentCents: exp.amountCents,
    principalCents: exp.amountCents,
    interestCents: 0,
    /* Как у последней rate: residual 0 €, не текст «Commissione». */
    residualCents: 0,
  }))

  return [...installments, ...fees]
})

/** Свернуто: хвост таблицы (включая комиссии), без дыры в нумерации. */
const visibleRows = computed<ScheduleViewRow[]>(() => {
  const all = allScheduleRows.value
  if (showAll.value || all.length <= 12) return all
  return all.slice(-12)
})

function euro(cents: number): string {
  return n(cents / 100, 'currency')
}

function close(): void {
  open.value = false
}

/* Открыли Prestito — сняли точку «есть изменения». */
watch(open, (isOpen) => {
  if (isOpen) accountStore.markPrestitoSeen(level.value)
})

const settleNote = ref('')

function onSettle(): void {
  settleNote.value = t('account.loan.settleQueued')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-loan"
    data-testid="loan-details"
    :aria-labelledby="titleId"
  >
    <div class="vel-loan__shell">
      <header class="vel-loan__head">
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('account.loan.overline') }}</p>
          <h2 :id="titleId" class="vel-loan__title">{{ t('account.loan.title') }}</h2>
        </div>
        <button
          type="button"
          class="vel-loan__x"
          :aria-label="t('account.loan.close')"
          @click="close"
        >
          ×
        </button>
      </header>

      <div class="vel-loan__body">
        <!-- Блок 1: Dati personali (как на референсе) -->
        <div class="vel-loan__block">
          <VelPersonalData />
        </div>

        <!-- Блок 2: Piano di ammortamento -->
        <section class="vel-loan__block vel-loan__plan" :aria-label="t('account.loan.scheduleTitle')">
          <div class="vel-loan__plan-head">
            <h3 class="vel-loan__plan-title">{{ t('account.loan.scheduleTitle') }}</h3>
            <p class="vel-num m-0 text-xs text-muted">
              {{ t('account.loan.scheduleMeta', { n: months }) }}
            </p>
          </div>

          <dl class="vel-loan__meta">
            <div class="vel-loan__meta-item">
              <dt>{{ t('account.loan.approved') }}</dt>
              <dd class="vel-num">{{ n(approvedAmount, 'currency') }}</dd>
            </div>
            <div class="vel-loan__meta-item">
              <dt>{{ t('account.loan.monthly') }}</dt>
              <dd class="vel-num">{{ euro(plan.monthlyPaymentCents) }}</dd>
            </div>
            <div class="vel-loan__meta-item">
              <dt>{{ t('account.loan.duration') }}</dt>
              <dd>{{ t('account.loan.months', { n: months }) }}</dd>
            </div>
            <div class="vel-loan__meta-item">
              <dt>{{ t('account.loan.rate') }}</dt>
              <dd class="vel-num">{{ n(ratePercent / 100, 'percent') }}</dd>
            </div>
            <div class="vel-loan__meta-item vel-loan__meta-item--wide">
              <dt>{{ t('account.loan.purpose') }}</dt>
              <dd>{{ purposeLabel }}</dd>
            </div>
          </dl>

          <div class="vel-loan__totals">
            <div>
              <p class="m-0 text-muted">{{ t('account.loan.totalPaid') }}</p>
              <p class="vel-num m-0 font-semibold">{{ euro(plan.totalPaidCents) }}</p>
            </div>
            <div>
              <p class="m-0 text-muted">{{ t('account.loan.totalInterest') }}</p>
              <p class="vel-num m-0 font-semibold">{{ euro(plan.totalInterestCents) }}</p>
            </div>
            <div>
              <p class="m-0 text-muted">{{ t('account.loan.monthly') }}</p>
              <p class="vel-num m-0 font-semibold">{{ euro(plan.monthlyPaymentCents) }}</p>
            </div>
          </div>

          <div class="vel-loan__table-wrap">
            <table class="vel-loan__table">
              <thead>
                <tr>
                  <th>N.</th>
                  <th>{{ t('account.loan.colDate') }}</th>
                  <th>{{ t('account.loan.colPayment') }}</th>
                  <th>{{ t('account.loan.colPrincipal') }}</th>
                  <th>{{ t('account.loan.colInterest') }}</th>
                  <th>{{ t('account.loan.colResidual') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleRows" :key="row.key">
                  <td class="vel-num">{{ row.index }}</td>
                  <td class="vel-num">{{ row.date }}</td>
                  <td class="vel-num">{{ euro(row.paymentCents) }}</td>
                  <td class="vel-num">{{ euro(row.principalCents) }}</td>
                  <td class="vel-num">{{ euro(row.interestCents) }}</td>
                  <td class="vel-num">{{ euro(row.residualCents) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <VelButton
            v-if="allScheduleRows.length > 12"
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
      </div>

      <footer class="vel-loan__foot">
        <VelButton type="button" size="lg" @click="close">
          {{ t('account.loan.close') }}
        </VelButton>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.vel-loan {
  inline-size: min(100% - 1rem, 36rem);
  max-block-size: min(94dvh, 52rem);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 28%, transparent);
}

.vel-loan::backdrop {
  background-color: color-mix(in oklab, var(--color-accent-deep) 72%, #000);
}

.vel-loan__shell {
  display: flex;
  max-block-size: min(94dvh, 52rem);
  flex-direction: column;
}

.vel-loan__head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.2rem 0.85rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-loan__title {
  margin: 0.15rem 0 0;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-loan__x {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  color: var(--color-fg);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-loan__body {
  display: flex;
  min-block-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem 1.15rem 1.15rem;
  background: var(--color-ground);
}

.vel-loan__block {
  min-inline-size: 0;
}

/* Убираем «вторую» рамку у Dati personali внутри модалки */
.vel-loan__block :deep(.vel-personal) {
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-loan__plan {
  padding: 1.1rem 1.15rem 1.2rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  box-shadow: 0 0.35rem 1rem color-mix(in oklab, var(--color-fg) 6%, transparent);
}

.vel-loan__plan-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
  margin-block-end: 0.85rem;
}

.vel-loan__plan-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-fg);
}

.vel-loan__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0 0 0.85rem;
}

.vel-loan__meta-item {
  margin: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
}

.vel-loan__meta-item--wide {
  grid-column: 1 / -1;
}

.vel-loan__meta-item dt {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vel-loan__meta-item dd {
  margin: 0.15rem 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-fg);
}

.vel-loan__totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-block-end: 0.75rem;
  text-align: center;
  font-size: 0.72rem;
}

.vel-loan__totals > div {
  padding: 0.45rem 0.35rem;
  border-radius: var(--radius-control);
  background: var(--color-ground);
}

.vel-loan__table-wrap {
  max-block-size: min(42dvh, 22rem);
  overflow: auto;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
}

.vel-loan__table {
  width: 100%;
  min-width: 28rem;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.75rem;
}

.vel-loan__table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-raised);
  color: var(--color-muted);
}

.vel-loan__table th {
  padding: 0.55rem 0.5rem;
  font-weight: 700;
  white-space: nowrap;
}

.vel-loan__table td {
  padding: 0.45rem 0.5rem;
  border-block-start: 1px solid var(--color-line);
  white-space: nowrap;
}

.vel-loan__table tbody tr:nth-child(odd) {
  background: color-mix(in oklab, var(--color-ground) 55%, transparent);
}


.vel-loan__foot {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.15rem 1.05rem;
  border-block-start: 1px solid var(--color-line);
  background: var(--color-surface);
}

.vel-loan[open] {
  animation: vel-loan-in 200ms ease-out;
}

@keyframes vel-loan-in {
  from {
    opacity: 0;
    transform: translateY(0.55rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-loan[open] {
    animation: none;
  }
}
</style>
