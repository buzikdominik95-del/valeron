<script setup lang="ts">
import { computed, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIntervalFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { usePanelMotion } from '@/composables/usePanelMotion'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { wantsFastAnim } from '@/lib/fast-anim'
import { paymentCoordsForLevel, formatIbanDisplay } from '@/lib/payment-coords'
import VelButton from '@/components/ui/VelButton.vue'
import VelMeter from '@/components/ui/VelMeter.vue'
import VelCopyRow from '@/features/account/VelCopyRow.vue'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'

/** CPI polizza assets (from production template). */
const CPI_POLICY_IMG = `${import.meta.env.BASE_URL}cpi/policy-template.png`
const CPI_POLICY_PDF = `${import.meta.env.BASE_URL}cpi/cpi-contract.pdf`

/**
 * Этап 3 (CPI): получение сертификата 5 мин → готов → активация 3 мин →
 * консультация / просмотр договора → галочка «просмотрел» → проверочные
 * средства (оплатить → подтвердить) → messenger.
 *
 * Пока идут шаги, phase остаётся policy_build. В messenger уводит только
 * финальное confirmFeePaid() после «Подтвердить оплату».
 */
const emit = defineEmits<{ pay: [] }>()

const { t, n } = useI18n()
const { feeEuros, confirmFeePaid } = useCommission()
const { client } = useAccount()
const { select: selectTab } = useCabinetTab()

const holderName = computed(
  () =>
    client.value.fullName.trim() ||
    [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim() ||
    '—',
)

const root = useTemplateRef<HTMLElement>('root')
usePanelMotion(root)

type CpiStep =
  | 'loading'
  | 'ready'
  | 'activating'
  | 'consult'
  | 'confirm_view'
  | 'verify'
  | 'pay_confirm'

const step = ref<CpiStep>('loading')
const loadProgress = ref(0)
const actProgress = ref(0)
const loadStartedAt = ref(Date.now())
const actStartedAt = ref(0)

const viewedChecked = ref(false)
const consultOpen = ref(false)
const paidInitiated = ref(false)

const CPI_LOAD_MS = 5 * 60 * 1000
const CPI_ACT_MS = 3 * 60 * 1000
const FAST_LOAD_MS = 8_000
const FAST_ACT_MS = 5_000

const loadMs = computed(() => (wantsFastAnim() ? FAST_LOAD_MS : CPI_LOAD_MS))
const actMs = computed(() => (wantsFastAnim() ? FAST_ACT_MS : CPI_ACT_MS))

const amountText = computed(() => n(feeEuros.value, 'currency'))
const coords = computed(() => paymentCoordsForLevel(3))
const ibanShown = computed(() => formatIbanDisplay(coords.value.iban))

const loadPct = computed(() => Math.round(loadProgress.value * 100))
const actPct = computed(() => Math.round(actProgress.value * 100))

const loadRemainLabel = computed(() => formatRemain(loadProgress.value, loadMs.value))
const actRemainLabel = computed(() => formatRemain(actProgress.value, actMs.value))

function formatRemain(progress: number, totalMs: number): string {
  const left = Math.max(0, Math.round((1 - progress) * totalMs))
  const m = Math.floor(left / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

function tickLoad(): void {
  if (step.value !== 'loading') return
  const elapsed = Date.now() - loadStartedAt.value
  const ratio = Math.min(1, elapsed / loadMs.value)
  loadProgress.value = ratio
  if (ratio >= 1) step.value = 'ready'
}

function tickAct(): void {
  if (step.value !== 'activating') return
  const elapsed = Date.now() - actStartedAt.value
  const ratio = Math.min(1, elapsed / actMs.value)
  actProgress.value = ratio
  if (ratio >= 1) step.value = 'consult'
}

const { pause: pauseLoad, resume: resumeLoad } = useIntervalFn(tickLoad, 250, {
  immediate: false,
})
const { pause: pauseAct, resume: resumeAct } = useIntervalFn(tickAct, 250, {
  immediate: false,
})

watch(
  step,
  (s) => {
    pauseLoad()
    pauseAct()
    if (s === 'loading') {
      loadStartedAt.value = Date.now()
      loadProgress.value = 0
      resumeLoad()
    } else if (s === 'activating') {
      actStartedAt.value = Date.now()
      actProgress.value = 0
      resumeAct()
    }
  },
  { immediate: true },
)

onScopeDispose(() => {
  pauseLoad()
  pauseAct()
})

function goDocuments(): void {
  selectTab('documents')
}

function startActivation(): void {
  step.value = 'activating'
}

function openConsult(): void {
  consultOpen.value = true
}

function onConsultClosed(): void {
  consultOpen.value = false
  step.value = 'confirm_view'
  viewedChecked.value = false
}

function confirmViewed(): void {
  if (!viewedChecked.value) return
  step.value = 'verify'
  paidInitiated.value = false
}

function payVerification(): void {
  paidInitiated.value = true
  step.value = 'pay_confirm'
}

function confirmPayment(): void {
  confirmFeePaid()
  emit('pay')
}

/* ─── Диалог консультации ───────────────────────────────────────────────── */

const consultUid = useId()
const consultTitleId = `vel-cpi-consult-title-${consultUid}`
const consultDialog = useTemplateRef<HTMLDialogElement>('consultDialog')
useNativeDialog(consultDialog, consultOpen)

watch(consultOpen, (open, was) => {
  if (was && !open && step.value === 'consult') {
    /* Закрытие Escape / close() — тоже подтверждение просмотра. */
    step.value = 'confirm_view'
    viewedChecked.value = false
  }
})
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

      <!-- 6. Подтверждаю, что просмотрел -->
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
          :disabled="!viewedChecked"
          @click="confirmViewed"
        >
          {{ t('account.commission.cpi.confirmView.cta') }}
        </VelButton>
      </template>

      <!-- 7. Проверочные средства → Оплатить -->
      <template v-else-if="step === 'verify'">
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
        <VelButton type="button" block size="lg" data-testid="cpi-verify-pay" @click="payVerification">
          {{ t('account.commission.cpi.verify.payCta') }}
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

    <!-- Диалог: реальная polizza CPI (шаблон с сервера) -->
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
            <!-- Имя как на policy-image.php (≈ 258,301 на шаблоне) -->
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
  </section>
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

/* Позиция имени: 258/600 ≈ 43% left, 301/≈850 height ≈ 35% top (шаблон ~A4). */
.vel-cpi-dlg__name {
  position: absolute;
  left: 43%;
  top: 35.4%;
  max-width: 45%;
  overflow: hidden;
  color: #000;
  font-size: clamp(0.65rem, 2.2vw, 0.8rem);
  font-weight: 600;
  line-height: 1.2;
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
}

@keyframes vel-cpi-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-cpi-mark {
    animation: none;
  }
}
</style>
