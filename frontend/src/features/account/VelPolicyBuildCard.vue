<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import {
  commissionBreakdown,
  breakdownLabelSet,
} from '@/lib/commission-breakdown'
import { wantsFastAnim } from '@/lib/fast-anim'
import VelButton from '@/components/ui/VelButton.vue'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/** CPI polizza assets (from production template). */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`
const CPI_POLICY_PDF = `${import.meta.env.BASE_URL}cpi/cpi-contract.pdf`

/**
 * Этап 3 (CPI):
 * loading → ready → activating → consult → confirm_view (галочка)
 * → полноэкранная мини-загрузка + «одобрено»
 * → модалка комиссии с breakdown (как L1/L2) → pay_confirm → messenger.
 */
const emit = defineEmits<{ pay: [] }>()

const { t, n } = useI18n()
const { feeEuros, feeReason, confirmFeePaid } = useCommission()
const { client } = useAccount()
const { select: selectTab } = useCabinetTab()
const cpi = useCpiBuild()
const reducedMotion = usePreferredReducedMotion()

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

const amountText = computed(() => n(feeEuros.value, 'currency'))
const coords = computed(() => paymentCoordsForLevel(3))
const ibanShown = computed(() => formatIbanDisplay(coords.value.iban))

const reasonTitle = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.title`))
const reasonBody = computed(() => t(`account.commission.fee.reasons.${feeReason.value}.body`))
const parts = computed(() => commissionBreakdown(feeEuros.value, feeReason.value))
const labelSet = computed(() => breakdownLabelSet(feeReason.value))

function lineLabel(key: 'tax' | 'service' | 'sign'): string {
  return t(`account.commission.fee.lines.${labelSet.value}.${key}`)
}

function lineAmount(euros: number): string {
  const whole = Number.isInteger(euros) || Math.abs(euros - Math.round(euros)) < 0.005
  return n(euros, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })
}

const {
  step,
  loadProgress,
  actProgress,
  loadPct,
  actPct,
  loadRemainLabel,
  actRemainLabel,
  viewedChecked,
  startActivation,
  openConsultDone,
  confirmViewed,
  payVerification,
} = cpi

const consultOpen = ref(false)
const feeModalOpen = ref(false)

/** Полноэкран: загрузка → галочка одобрения после «Conferma». */
const approvalOpen = ref(false)
const approvalPhase = ref<'loading' | 'ok'>('loading')

function goDocuments(): void {
  selectTab('documents')
}

function openConsult(): void {
  consultOpen.value = true
}

function onConsultClosed(): void {
  consultOpen.value = false
  openConsultDone()
}

function openFeeModal(): void {
  feeModalOpen.value = true
}

function loadMs(): number {
  if (reducedMotion.value === 'reduce') return 120
  if (wantsFastAnim()) return 400
  return 900
}

function okMs(): number {
  if (reducedMotion.value === 'reduce') return 200
  if (wantsFastAnim()) return 500
  return 1000
}

const { start: startOkPhase, stop: stopOkPhase } = useTimeoutFn(
  () => {
    approvalPhase.value = 'ok'
    startFinishApproval()
  },
  loadMs,
  { immediate: false },
)

const { start: startFinishApproval, stop: stopFinishApproval } = useTimeoutFn(
  () => {
    approvalOpen.value = false
    confirmViewed()
    feeModalOpen.value = true
  },
  okMs,
  { immediate: false },
)

/**
 * Галочка + Conferma → fullscreen loading/approve → модалка комиссии.
 */
function onConfirmViewed(): void {
  if (!viewedChecked.value || approvalOpen.value) return
  stopOkPhase()
  stopFinishApproval()
  approvalPhase.value = 'loading'
  approvalOpen.value = true
  startOkPhase()
}

function onFeePay(): void {
  feeModalOpen.value = false
  payVerification()
}

function confirmPayment(): void {
  confirmFeePaid()
  emit('pay')
}

/* ─── Диалоги ───────────────────────────────────────────────────────────── */

const consultUid = useId()
const consultTitleId = `vel-cpi-consult-title-${consultUid}`
const consultDialog = useTemplateRef<HTMLDialogElement>('consultDialog')
useNativeDialog(consultDialog, consultOpen)

const feeUid = useId()
const feeTitleId = `vel-cpi-fee-title-${feeUid}`
const feeDialog = useTemplateRef<HTMLDialogElement>('feeDialog')
useNativeDialog(feeDialog, feeModalOpen)

watch(consultOpen, (open, was) => {
  if (was && !open && step.value === 'consult') {
    openConsultDone()
  }
})

/** На verify без открытой модалки (F5 / закрыли) — карточка + CTA открыть. */
const showVerifyCard = computed(() => step.value === 'verify' && !feeModalOpen.value)
</script>

<template>
  <section
    ref="root"
    class="relative overflow-hidden rounded-panel border border-line bg-surface p-5 sm:p-6"
    data-testid="cpi-stage"
  >
    <VelBorderBeam :duration-ms="6500" :size="56" />

    <div class="relative z-[1] flex flex-col gap-4">
      <!-- 1. Получение сертификата CPI (5 мин) -->
      <template v-if="step === 'loading'">
        <div class="flex items-start gap-3">
          <span class="vel-cpi-mark shrink-0 text-accent-deep">
            <VelAccountSign sign="shield" size="lg" />
          </span>
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.loading.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.loading.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.loading.body') }}</p>
        <VelMeter :value="loadProgress" :label="t('account.commission.cpi.loading.meter')" />
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span class="vel-num font-semibold">
            {{ t('account.commission.cpi.pct', { value: loadPct }) }}
          </span>
          <span class="vel-num">{{ t('account.commission.cpi.remain', { time: loadRemainLabel }) }}</span>
        </div>
        <VelButton
          type="button"
          variant="outline"
          block
          size="lg"
          data-testid="cpi-go-docs"
          @click="goDocuments"
        >
          {{ t('account.commission.cpi.loading.docsCta') }}
        </VelButton>
      </template>

      <!-- 3. Сертификат готов -->
      <template v-else-if="step === 'ready'">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="shield-check" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.ready.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.ready.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.ready.body') }}</p>
        <VelButton type="button" block size="lg" data-testid="cpi-start-activation" @click="startActivation">
          {{ t('account.commission.cpi.ready.cta') }}
        </VelButton>
      </template>

      <!-- 4. Активация 3 мин -->
      <template v-else-if="step === 'activating'">
        <div class="flex items-start gap-3">
          <span class="vel-cpi-mark shrink-0 text-accent-deep">
            <VelAccountSign sign="shield" size="lg" />
          </span>
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.activating.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.activating.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.activating.body') }}</p>
        <VelMeter :value="actProgress" :label="t('account.commission.cpi.activating.meter')" />
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span class="vel-num font-semibold">
            {{ t('account.commission.cpi.pct', { value: actPct }) }}
          </span>
          <span class="vel-num">{{ t('account.commission.cpi.remain', { time: actRemainLabel }) }}</span>
        </div>
      </template>

      <!-- 5. Проконсультироваться -->
      <template v-else-if="step === 'consult'">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="shield-check" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.consult.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.consult.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.consult.body') }}</p>
        <VelButton type="button" block size="lg" data-testid="cpi-consult" @click="openConsult">
          {{ t('account.commission.cpi.consult.cta') }}
        </VelButton>
      </template>

      <!-- 6. Галочка «просмотрел» → потом fullscreen approve → модалка комиссии -->
      <template v-else-if="step === 'confirm_view'">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="shield" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.confirmView.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.confirmView.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.confirmView.body') }}</p>
        <label
          class="flex cursor-pointer items-start gap-3 rounded-control border border-line bg-ground px-3 py-3"
          data-testid="cpi-view-check-label"
        >
          <input
            v-model="viewedChecked"
            type="checkbox"
            class="vel-cpi-check mt-0.5"
            data-testid="cpi-view-check"
          />
          <span class="text-sm text-fg">{{ t('account.commission.cpi.confirmView.checkbox') }}</span>
        </label>
        <VelButton
          type="button"
          block
          size="lg"
          data-testid="cpi-view-confirm"
          :disabled="!viewedChecked || approvalOpen"
          @click="onConfirmViewed"
        >
          {{ t('account.commission.cpi.confirmView.cta') }}
        </VelButton>
      </template>

      <!-- 7. Карточка, если модалку закрыли — снова открыть breakdown -->
      <template v-else-if="showVerifyCard">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.verify.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.verify.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.verify.body') }}</p>
        <div
          class="flex flex-col gap-1 rounded-control border border-accent/40 bg-accent/5 px-4 py-3"
          data-testid="cpi-verify-amount"
        >
          <span class="vel-label">{{ t('account.commission.cpi.verify.amountLabel') }}</span>
          <span class="vel-num text-2xl font-semibold text-accent-deep">{{ amountText }}</span>
        </div>
        <VelButton type="button" block size="lg" data-testid="cpi-verify-open-fee" @click="openFeeModal">
          {{ t('account.commission.cpi.verify.openFeeCta') }}
        </VelButton>
      </template>

      <!-- 7b. Подтвердить оплату → messenger -->
      <template v-else-if="step === 'pay_confirm'">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label">{{ t('account.commission.cpi.payConfirm.overline') }}</p>
            <h2 class="m-0 text-xl font-semibold text-fg sm:text-2xl">
              {{ t('account.commission.cpi.payConfirm.title') }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.payConfirm.body') }}</p>
        <div class="rounded-control border border-line bg-ground px-3">
          <VelCopyRow :label="t('account.payment.beneficiary')" :value="coords.beneficiary" />
          <VelCopyRow :label="t('account.payment.iban')" :value="ibanShown" mono />
          <VelCopyRow :label="t('account.payment.swift')" :value="coords.swift" mono />
          <VelCopyRow :label="t('account.payment.amount')" :value="amountText" />
        </div>
        <VelButton
          type="button"
          block
          size="lg"
          data-testid="cpi-pay-confirm"
          @click="confirmPayment"
        >
          {{ t('account.commission.cpi.payConfirm.cta') }}
        </VelButton>
      </template>
    </div>

    <!-- Диалог: polizza CPI -->
    <dialog
      ref="consultDialog"
      class="vel-cpi-dlg"
      data-testid="cpi-consult-dialog"
      :aria-labelledby="consultTitleId"
    >
      <form class="vel-cpi-dlg__form" @submit.prevent="onConsultClosed">
        <h2 :id="consultTitleId" class="vel-cpi-dlg__title">
          {{ t('account.commission.cpi.consult.dialogTitle') }}
        </h2>
        <p class="m-0 text-sm text-muted">{{ t('account.commission.cpi.consult.dialogLead') }}</p>

        <div class="vel-cpi-dlg__doc">
          <div class="vel-cpi-dlg__sheet">
            <img
              class="vel-cpi-dlg__img"
              :src="CPI_POLICY_IMG"
              :alt="t('account.commission.cpi.consult.contractTitle')"
              width="600"
              height="auto"
            />
            <span class="vel-cpi-dlg__name" aria-hidden="true">{{ holderName }}</span>
          </div>
        </div>

        <a
          class="vel-cpi-dlg__pdf"
          :href="CPI_POLICY_PDF"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('account.commission.cpi.consult.openPdf') }}
        </a>

        <VelButton type="submit" block size="lg" data-testid="cpi-consult-close">
          {{ t('account.commission.cpi.consult.closeCta') }}
        </VelButton>
      </form>
    </dialog>

    <!-- Модалка комиссии: breakdown как на L1/L2 -->
    <dialog
      ref="feeDialog"
      class="vel-cpi-dlg vel-cpi-fee-dlg"
      data-testid="cpi-fee-dialog"
      :aria-labelledby="feeTitleId"
    >
      <form class="vel-cpi-dlg__form" @submit.prevent="onFeePay">
        <div class="flex items-start gap-3">
          <VelAccountSign sign="card" size="lg" class="shrink-0 text-accent-deep" />
          <div class="min-w-0">
            <p class="vel-label m-0">{{ t('account.commission.cpi.verify.overline') }}</p>
            <h2 :id="feeTitleId" class="vel-cpi-dlg__title">
              {{ reasonTitle }}
            </h2>
          </div>
        </div>
        <p class="m-0 text-sm text-muted">{{ reasonBody }}</p>

        <div class="vel-cpi-fee-box" data-testid="cpi-fee-breakdown">
          <p class="vel-label vel-cpi-fee-box__cap m-0">
            {{ t('account.commission.fee.amountLabel') }}
          </p>
          <p class="vel-cpi-fee-box__total vel-num m-0">{{ amountText }}</p>
          <ul
            v-if="parts.visible"
            class="vel-cpi-fee-box__lines"
            :aria-label="t('account.commission.fee.amountLabel')"
          >
            <li v-for="line in parts.lines" :key="line.key" class="vel-cpi-fee-box__line">
              <span class="vel-cpi-fee-box__label">{{ lineLabel(line.key) }}</span>
              <span class="vel-cpi-fee-box__sum vel-num">{{ lineAmount(line.amountEuros) }}</span>
            </li>
          </ul>
        </div>

        <p class="m-0 text-xs text-faint">{{ t('account.commission.fee.note') }}</p>

        <VelButton type="submit" block size="lg" data-testid="cpi-verify-pay">
          {{ t('account.commission.cpi.verify.payCta') }}
        </VelButton>
      </form>
    </dialog>
  </section>

  <!-- Полноэкран: мини-загрузка + значок одобрения -->
  <Teleport to="body">
    <Transition name="vel-cpi-appr">
      <div
        v-if="approvalOpen"
        class="vel-cpi-appr"
        role="status"
        aria-live="polite"
        data-testid="cpi-approval-overlay"
        :aria-label="
          approvalPhase === 'loading'
            ? t('account.commission.cpi.approval.loadingAria')
            : t('account.commission.cpi.approval.okAria')
        "
      >
        <div class="vel-cpi-appr__bg" aria-hidden="true">
          <span class="vel-cpi-appr__glow" />
        </div>
        <div class="vel-cpi-appr__stage">
          <div
            class="vel-cpi-appr__icon"
            :class="approvalPhase === 'ok' ? 'vel-cpi-appr__icon--ok' : 'vel-cpi-appr__icon--load'"
          >
            <template v-if="approvalPhase === 'loading'">
              <span class="vel-cpi-appr__spinner" />
            </template>
            <template v-else>
              <span class="vel-cpi-appr__check" aria-hidden="true">
                <VelAccountSign sign="shield-check" size="lg" />
              </span>
            </template>
          </div>
          <p class="vel-cpi-appr__title m-0">
            {{
              approvalPhase === 'loading'
                ? t('account.commission.cpi.approval.loading')
                : t('account.commission.cpi.approval.ok')
            }}
          </p>
          <p class="vel-cpi-appr__sub m-0">
            {{
              approvalPhase === 'loading'
                ? t('account.commission.cpi.approval.loadingHint')
                : t('account.commission.cpi.approval.okHint')
            }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-cpi-mark {
  display: inline-flex;
  animation: vel-cpi-spin 8s linear infinite;
  transform-origin: center;
}

.vel-cpi-check {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  accent-color: var(--color-accent);
}

.vel-cpi-dlg {
  inline-size: min(100% - 1rem, 38rem);
  max-block-size: min(95dvh, 52rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-cpi-dlg::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-cpi-dlg__doc {
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-ground);
}

.vel-cpi-dlg__sheet {
  position: relative;
  display: block;
  width: 100%;
}

.vel-cpi-dlg__img {
  display: block;
  width: 100%;
  height: auto;
}

/* Имя = тон основного текста бланка (не жирный чёрный) */
.vel-cpi-dlg__name {
  position: absolute;
  left: 29.5%;
  top: 23.55%;
  max-width: 52%;
  overflow: hidden;
  color: #3a3f4a;
  font-family: Georgia, 'Times New Roman', Times, serif;
  font-size: clamp(0.55rem, 1.75vw, 0.72rem);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.005em;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}

.vel-cpi-dlg__pdf {
  display: block;
  text-align: center;
  color: var(--color-accent-deep);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.vel-cpi-dlg__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.vel-cpi-dlg__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.25;
}

/* Breakdown — как VelCommissionFeeStep */
.vel-cpi-fee-box {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.25rem 1.25rem 1.15rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 28%, var(--color-line));
  border-radius: var(--radius-panel);
  background:
    linear-gradient(
      160deg,
      color-mix(in oklab, var(--color-accent) 10%, var(--color-surface)) 0%,
      color-mix(in oklab, var(--color-accent) 3%, var(--color-surface)) 55%,
      var(--color-surface) 100%
    );
  box-shadow:
    0 0.35rem 1.1rem color-mix(in oklab, var(--color-accent-deep) 6%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
}

.vel-cpi-fee-box__cap {
  color: var(--color-accent);
  font-weight: 700;
}

.vel-cpi-fee-box__total {
  font-size: clamp(2.5rem, 11vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.95;
  color: var(--color-accent-deep);
  font-variant-numeric: tabular-nums;
  text-wrap: nowrap;
  text-shadow: 0 1px 0 color-mix(in oklab, #fff 55%, transparent);
}

.vel-cpi-fee-box__lines {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin: 0.15rem 0 0;
  padding: 0.75rem 0 0;
  border-block-start: 1px solid color-mix(in oklab, var(--color-accent) 18%, var(--color-line));
  list-style: none;
}

.vel-cpi-fee-box__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 0.75rem 1rem;
}

.vel-cpi-fee-box__label {
  min-inline-size: 0;
  color: var(--color-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vel-cpi-fee-box__sum {
  color: var(--color-accent-deep);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Fullscreen approval */
.vel-cpi-appr {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: color-mix(in oklab, #0a162c 92%, transparent);
  color: #fff;
  text-align: center;
  backdrop-filter: blur(10px);
}

.vel-cpi-appr__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.vel-cpi-appr__glow {
  position: absolute;
  inset-block-start: 28%;
  inset-inline-start: 50%;
  width: min(22rem, 70vw);
  height: min(22rem, 70vw);
  translate: -50% -40%;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 45%, transparent);
  filter: blur(48px);
  opacity: 0.65;
  animation: vel-cpi-appr-pulse 2s ease-in-out infinite;
}

.vel-cpi-appr__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  max-inline-size: 20rem;
}

.vel-cpi-appr__icon {
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, #fff 28%, transparent);
  background: color-mix(in oklab, #fff 8%, transparent);
  box-shadow: 0 0 0 8px color-mix(in oklab, var(--color-accent) 18%, transparent);
}

.vel-cpi-appr__icon--ok {
  border-color: color-mix(in oklab, var(--color-success) 55%, #fff);
  background: color-mix(in oklab, var(--color-success) 22%, transparent);
  box-shadow:
    0 0 0 10px color-mix(in oklab, var(--color-success) 18%, transparent),
    0 0 32px color-mix(in oklab, var(--color-success) 35%, transparent);
  animation: vel-cpi-appr-pop 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-cpi-appr__spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid color-mix(in oklab, #fff 25%, transparent);
  border-top-color: #fff;
  border-radius: 999px;
  animation: vel-cpi-spin 0.75s linear infinite;
}

.vel-cpi-appr__check {
  display: inline-flex;
  color: #fff;
  filter: drop-shadow(0 0 10px color-mix(in oklab, var(--color-success) 50%, transparent));
}

.vel-cpi-appr__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.vel-cpi-appr__sub {
  color: color-mix(in oklab, #fff 72%, transparent);
  font-size: 0.875rem;
  line-height: 1.4;
}

.vel-cpi-appr-enter-active,
.vel-cpi-appr-leave-active {
  transition: opacity 280ms ease;
}

.vel-cpi-appr-enter-from,
.vel-cpi-appr-leave-to {
  opacity: 0;
}

@keyframes vel-cpi-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-cpi-appr-pulse {
  0%,
  100% {
    opacity: 0.45;
    scale: 1;
  }

  50% {
    opacity: 0.75;
    scale: 1.06;
  }
}

@keyframes vel-cpi-appr-pop {
  from {
    opacity: 0;
    transform: scale(0.72);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-cpi-mark,
  .vel-cpi-appr__spinner,
  .vel-cpi-appr__glow,
  .vel-cpi-appr__icon--ok {
    animation: none;
  }

  .vel-cpi-appr-enter-active,
  .vel-cpi-appr-leave-active {
    transition: none;
  }
}
</style>
