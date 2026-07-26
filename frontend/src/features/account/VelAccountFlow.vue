<script setup lang="ts">
import { computed, onMounted, provide, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import { isApiEnabled } from '@/api/account.api'
import { demoLogin } from '@/api/auth.api'

import VelAccount from '@/features/account/VelAccount.vue'
import VelPayoutCard from '@/features/account/VelPayoutCard.vue'
import VelPayoutPanel from '@/features/account/VelPayoutPanel.vue'
import { PAYOUT_PANEL_KEY } from '@/features/account/payout-panel'
import VelBankNoticeDialog from '@/features/account/VelBankNoticeDialog.vue'
import VelWithdrawAmountDialog from '@/features/account/VelWithdrawAmountDialog.vue'
import VelCommissionDrawer from '@/features/account/VelCommissionDrawer.vue'
import VelBankAuthorizing from '@/features/account/VelBankAuthorizing.vue'
import VelPolicyCard from '@/features/account/VelPolicyCard.vue'
import VelDocumentUpload from '@/features/account/VelDocumentUpload.vue'
import VelContractCard from '@/features/account/VelContractCard.vue'
import VelContractSheet from '@/features/account/VelContractSheet.vue'
import VelContractSignDialog from '@/features/account/VelContractSignDialog.vue'
import VelCoachGuide from '@/features/account/VelCoachGuide.vue'
import VelSuspensionCard from '@/features/account/VelSuspensionCard.vue'
import VelPolicyBuildCard from '@/features/account/VelPolicyBuildCard.vue'
import VelPayoutFailed from '@/features/account/VelPayoutFailed.vue'
import VelTransferAnim from '@/features/account/VelTransferAnim.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelLoanDetails from '@/features/account/VelLoanDetails.vue'
import VelDevCommissionBar from '@/features/account/VelDevCommissionBar.vue'
import VelTransferSuccess from '@/features/account/VelTransferSuccess.vue'
import VelAccountToast from '@/features/account/VelAccountToast.vue'
import { useCabinetTab } from '@/composables/useCabinetTab'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const { steps, canWithdraw, isAuthorizing, approvedAmount } = useAccount()
const {
  isPayFee,
  isMessenger,
  isWaiting,
  isAnimating,
  isSuspended,
  isPolicyBuild,
  isFailed,
  isReady,
  phase,
  level,
  beginWithdraw,
  openFeeFromSuspension,
} = useCommission()
const { select: selectTab } = useCabinetTab()

const apiError = ref<string | null>(null)

onMounted(() => {
  if (!isApiEnabled()) return
  void demoLogin()
    .then(() => dossier.pullAccount())
    .catch((e: unknown) => {
      apiError.value = e instanceof Error ? e.message : 'API unavailable'
    })
})

/** Contratto con vecchio prod Calipso (public/cpi/cpi-contract.pdf). */
const contractPdfUrl = `${import.meta.env.BASE_URL}cpi/cpi-contract.pdf`
/* payoutOpen убран: форма — выпадающая VelPayoutPanel под балансом */
/** Этап 2: «данные в банк, 5–10 мин» до 7-минутной анимации. */
const bankNoticeOpen = ref(false)
/** Сумма вывода (ползунок) → затем drawer комиссии. */
const amountOpen = ref(false)
const withdrawAmount = ref(0)
const commissionOpen = ref(false)
/** Выпадающая панель метода (не модалка) под Preleva. */
const payoutPanelOpen = ref(false)
provide(PAYOUT_PANEL_KEY, payoutPanelOpen)
/* Счёт для зачисления кредита — своё окно, не окно вывода: почему именно так,
   написано в шапке VelContractIban.vue. */
/** IBAN + подпись в одной модалке */
const contractSignOpen = ref(false)
const loanOpen = ref(false)
const chosenFiles = ref<File[]>([])
/** Короткий toast «messaggio inviato» / «documenti pronti». */
const toastText = ref<string | null>(null)

const TOAST_MS = 2800

/*
 * Таймер из VueUse, а не голый setTimeout: useTimeoutFn снимает его сам при
 * размонтировании (tryOnScopeDispose внутри) — тот же приём, что в
 * VelStepFinalizing.vue и VelCopyRow.vue.
 *
 * Здесь это не только правило стиля. Прежняя запись держала таймер в let и
 * гасила его ТОЛЬКО при следующем toast: уйди человек с кабинета в первые
 * 2.8 с после сообщения — колбэк дожил бы до конца и записал toastText уже
 * снятого компонента. Повторный вызов start() перезапускает один и тот же
 * таймер, поэтому ручное clearTimeout перед показом больше не нужно.
 */
const { start: hideToastLater } = useTimeoutFn(
  () => {
    toastText.value = null
  },
  TOAST_MS,
  { immediate: false },
)

function showToast(message: string): void {
  toastText.value = message
  hideToastLater()
}

/**
 * Firma unlock: шаг documents done, ИЛИ флаг store, ИЛИ выбран ≥1 файл.
 * Следим и за length, и за deep — иначе после setInputFiles в Playwright
 * кнопка иногда оставалась disabled на один кадр.
 */
const documentsReady = computed(
  () =>
    steps.value.find((step) => step.id === 'documents')?.status === 'done' ||
    account.documentsUploaded === true ||
    chosenFiles.value.length > 0,
)

function unlockFirmaAfterDocs(): void {
  account.documentsUploaded = true
  account.markDone('documents')
  account.advanceTo('signature')
}

watch(
  chosenFiles,
  (files) => {
    if (files.length === 0) return
    unlockFirmaAfterDocs()
    showToast(t('account.docs.toastReady'))
  },
  { deep: true, flush: 'sync' },
)

watch(
  () => chosenFiles.value.length,
  (count, prev) => {
    if (count > 0 && (prev === 0 || prev === undefined)) {
      unlockFirmaAfterDocs()
    }
  },
)

function onContractSignConfirm(payload: { dataUrl: string; ibanSaved: boolean }): void {
  /* Подпись сразу в стор → лист договора рисует PNG. */
  account.markContractSigned(new Date(), payload.dataUrl)
  account.markDone('signature')
  showToast(
    payload.ibanSaved
      ? t('account.contract.toastSigned')
      : t('account.contract.toastSigned'),
  )
}

function openContractSign(): void {
  contractSignOpen.value = true
}

function onPolicyReview(): void {
  if (canWithdraw.value) onWithdraw()
}

/**
 * Старт воронки после суммы.
 * L2 ready → банк-уведомление → анимация.
 * L1 / fee → beginWithdraw → pay_fee → drawer комиссии.
 * L4 → анимация отказа.
 */
function startWithdrawFunnel(): void {
  if (level.value === 2 && isReady.value) {
    bankNoticeOpen.value = true
    return
  }
  beginWithdraw()
}

/**
 * Preleva по 4 этапам:
 *  · Этап 1 (или IBAN ещё не сохранён) → выпадающая панель «Scegli il metodo»
 *    (ввод IBAN один раз).
 *  · Этапы 2 / 3 / 4, IBAN уже есть → панель НЕ открываем, сразу анимация /
 *    воронка этапа (L2 notice+anim, L3 fee/policy, L4 fail anim).
 */
function onWithdraw(): void {
  if (!canWithdraw.value) return
  if (!isReady.value && !isSuspended.value) return
  if (isSuspended.value) {
    openFeeFromSuspension()
  }

  const hasIban = account.ibanProvided && account.ibanFull.trim() !== ''

  /* IBAN ещё нет — только панель ввода (обычно этап 1). */
  if (!hasIban) {
    if (payoutPanelOpen.value) return
    payoutPanelOpen.value = true
    return
  }

  /* IBAN уже зафиксирован → этапы 2–4 (и повтор L1) без повторного ввода. */
  continueAfterPayout(Math.round(approvedAmount.value))
}

/** После панели или сразу (если IBAN есть) → drawer / анимация по уровню. */
function continueAfterPayout(euros: number): void {
  withdrawAmount.value = euros
  payoutPanelOpen.value = false

  // L1 / L3 / страховка: pay_fee → drawer (IBAN-шаг пропускается, если уже есть).
  if (level.value === 1 || level.value === 3 || isSuspended.value) {
    if (!isPayFee.value) beginWithdraw()
    commissionOpen.value = true
    return
  }

  // L2 / L4: банк-уведомление или анимация.
  startWithdrawFunnel()
}

function onPayoutSubmitted(euros: number): void {
  continueAfterPayout(euros)
}

function onAmountConfirm(): void {
  amountOpen.value = false
  if (isPayFee.value) {
    commissionOpen.value = true
    return
  }
  startWithdrawFunnel()
}

function onBankNoticeContinue(): void {
  bankNoticeOpen.value = false
  beginWithdraw()
}

function onCommissionConfirmed(): void {
  commissionOpen.value = false
  // Чат с менеджером — отдельно, вкладка Assistenza (4.png).
  selectTab('support')
}

/** Комиссия в pay_fee → drawer (не инлайн-карточка). */
watch(isPayFee, (on) => {
  if (!on) {
    commissionOpen.value = false
    return
  }
  // Сумма уже из Preleva-панели; если нет — снова выпадающая форма.
  if (withdrawAmount.value <= 0) {
    payoutPanelOpen.value = true
    return
  }
  commissionOpen.value = true
})

/** Messenger / waiting: уходим с Home на Assistenza, чат не на главной. */
watch(
  () => isMessenger.value || isWaiting.value,
  (needChat) => {
    if (needChat) selectTab('support')
  },
)

function onOpenPdf(): void {
  window.open(contractPdfUrl, '_blank', 'noopener,noreferrer')
}

/*
 * ФИНАЛ ПЕРЕВОДА.
 *
 * Ловим не «прогресс дошёл до единицы», а сам выход из фазы animating: фазу
 * может закрыть и оператор со своей стороны, и тогда прогресс до конца не
 * доедет, а перевод всё равно завершён.
 *
 * Окно живёт ЗДЕСЬ, а не внутри VelTransferAnim: как только фаза сменилась,
 * тот экран размонтируется, и финал ушёл бы вместе с ним, не успев показаться.
 */
const successOpen = ref(false)

/*
 * Финал «перевод завершён» только если анимация не ушла в L2-страховку
 * (suspended) и не в L4-отказ (failed). Иначе поверх карточки страховки/отказа
 * всплывал бы ложный success.
 */
watch(isAnimating, (now, was) => {
  if (was && !now && !isSuspended.value && !isFailed.value) {
    successOpen.value = true
  }
})

const showClassicBank = computed(
  () => isAuthorizing.value && !isAnimating.value && !isSuspended.value && !isFailed.value,
)

const transferStage = computed((): { key: string; view: Component } | null => {
  if (isAnimating.value) return { key: `anim-${phase.value}`, view: VelTransferAnim }
  if (isSuspended.value) return { key: 'suspended', view: VelSuspensionCard }
  if (isFailed.value) return { key: 'failed', view: VelPayoutFailed }
  if (showClassicBank.value) return { key: 'bank', view: VelBankAuthorizing }
  // pay_fee → VelCommissionDrawer (оверлей), не карточка на Home
  if (isPolicyBuild.value) return { key: 'policy-build', view: VelPolicyBuildCard }
  // messenger / waiting — внутри VelCabinetSupport (один чат, без отдельной панели)
  return null
})

/*
 * Переключатель фаз L1–L4 — всегда на экране (демо + стенд + прод-сборка).
 * Скрыть только явным флагом: VITE_HIDE_PHASE_BAR=1
 */
const showDevBar = !(
  import.meta.env.VITE_HIDE_PHASE_BAR === '1' ||
  import.meta.env.VITE_HIDE_PHASE_BAR === 'true'
)
</script>

<template>
  <VelAccount>
    <!-- Баланс на первом плане; loan details — только когда открыт, ниже воронки. -->
    <template #summary>
      <VelPayoutCard
        :panel-open="payoutPanelOpen"
        @withdraw="onWithdraw"
        @open-loan="loanOpen = true"
      />
      <!-- Выпадающая форма метода (шаг 1 после Preleva) — не модалка -->
      <VelPayoutPanel
        v-model:open="payoutPanelOpen"
        class="mt-3"
        @submitted="onPayoutSubmitted"
      />
    </template>

    <template #transfer>
      <VelStageSwitch v-if="transferStage" :stage-key="transferStage.key">
        <component :is="transferStage.view" />
      </VelStageSwitch>

      <!--
        ПРИ ОТКАЗЕ СЦЕНА ПЕРЕВОДА ОСТАЁТСЯ НА ЭКРАНЕ, а карточка отказа встаёт
        под ней. Заказчик просил, чтобы движение не прекращалось: деньги ушли из
        банка и идут, до получателя не доходят.
      -->
      <VelTransferAnim v-if="isFailed" class="mt-4" />
      <VelLoanDetails v-model:open="loanOpen" class="mt-4" />
    </template>

    <template #policy>
      <!-- CPI-карточка только на 3-м уровне комиссии (см. изминенния / 1.png) -->
      <VelPolicyCard
        v-if="level === 3 && !isPolicyBuild && !isAnimating"
        @review="onPolicyReview"
      />
    </template>

    <template #documents>
      <VelDocumentUpload v-model="chosenFiles" />
    </template>

    <template #signature>
      <!-- Один блок: шапка договора + лист (2.png) -->
      <section class="vel-contract-block rounded-panel border border-line bg-surface p-4 sm:p-5">
        <VelContractCard
          :pdf-url="contractPdfUrl"
          :documents-ready="documentsReady"
          :iban-provided="account.ibanProvided"
          :signed="account.contractSigned"
          @sign="openContractSign"
          @open-pdf="onOpenPdf"
          @enter-iban="openContractSign"
        />
        <div class="mt-4 border-t border-line pt-4">
          <VelContractSheet />
        </div>
      </section>
    </template>

    <!-- side: personal data / docs убраны с Home — только Profilo / Documenti -->
  </VelAccount>

  <VelBankNoticeDialog v-model:open="bankNoticeOpen" @continue="onBankNoticeContinue" />
  <VelWithdrawAmountDialog
    v-model:open="amountOpen"
    v-model:amount="withdrawAmount"
    @confirm="onAmountConfirm"
  />
  <VelCommissionDrawer
    v-model:open="commissionOpen"
    @confirmed="onCommissionConfirmed"
  />
  <!-- IBAN + firma in una modale -->
  <VelContractSignDialog v-model:open="contractSignOpen" @confirm="onContractSignConfirm" />

  <VelCoachGuide />

  <!-- Полноэкранный финал перевода: сам уходит по таймеру, закрывается по Esc -->
  <VelTransferSuccess v-model:open="successOpen" />

  <VelDevCommissionBar v-if="showDevBar" />

  <VelAccountToast :text="toastText" />
</template>

<style scoped>
/* Единый блок договора: убираем вторую рамку у карточки внутри */
.vel-contract-block :deep(.vel-contract-card) {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}
</style>
