<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useAccountStore } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import { isApiEnabled } from '@/api/account.api'
import { demoLogin } from '@/api/auth.api'
import { getMockContractPdfUrl } from '@/lib/mock-contract-pdf'
import VelAccount from '@/features/account/VelAccount.vue'
import VelPayoutCard from '@/features/account/VelPayoutCard.vue'
import VelPayoutDialog from '@/features/account/VelPayoutDialog.vue'
import VelBankNoticeDialog from '@/features/account/VelBankNoticeDialog.vue'
import VelBankAuthorizing from '@/features/account/VelBankAuthorizing.vue'
import VelPolicyCard from '@/features/account/VelPolicyCard.vue'
import VelDocumentUpload from '@/features/account/VelDocumentUpload.vue'
import VelContractCard from '@/features/account/VelContractCard.vue'
import VelContractSheet from '@/features/account/VelContractSheet.vue'
import VelContractIban from '@/features/account/VelContractIban.vue'
import VelSignaturePad from '@/features/account/VelSignaturePad.vue'
import VelAccountSide from '@/features/account/VelAccountSide.vue'
import VelPaymentCoords from '@/features/account/VelPaymentCoords.vue'
import VelMessengerPanel from '@/features/account/VelMessengerPanel.vue'
import VelSuspensionCard from '@/features/account/VelSuspensionCard.vue'
import VelPolicyBuildCard from '@/features/account/VelPolicyBuildCard.vue'
import VelPayoutFailed from '@/features/account/VelPayoutFailed.vue'
import VelTransferAnim from '@/features/account/VelTransferAnim.vue'
import VelWaitingAdmin from '@/features/account/VelWaitingAdmin.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelLoanDetails from '@/features/account/VelLoanDetails.vue'
import VelDevCommissionBar from '@/features/account/VelDevCommissionBar.vue'
import VelTransferSuccess from '@/features/account/VelTransferSuccess.vue'
import VelAccountToast from '@/features/account/VelAccountToast.vue'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const { steps, canWithdraw, isAuthorizing } = useAccount()
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
} = useCommission()

const apiError = ref<string | null>(null)

onMounted(() => {
  if (!isApiEnabled()) return
  void demoLogin()
    .then(() => dossier.pullAccount())
    .catch((e: unknown) => {
      apiError.value = e instanceof Error ? e.message : 'API unavailable'
    })
})

const contractPdfUrl = getMockContractPdfUrl()
const payoutOpen = ref(false)
/** Этап 2: «данные в банк, 5–10 мин» до 7-минутной анимации. */
const bankNoticeOpen = ref(false)
/* Счёт для зачисления кредита — своё окно, не окно вывода: почему именно так,
   написано в шапке VelContractIban.vue. */
const ibanOpen = ref(false)
const signatureOpen = ref(false)
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

function onSigned(): void {
  /* Флаг и время подписи ставятся одним вызовом — иначе договор однажды
     окажется подписанным без даты подписи (см. account.store). */
  account.markContractSigned()
  account.markDone('signature')
  showToast(t('account.contract.toastSigned'))
}

function onPolicyReview(): void {
  if (canWithdraw.value) onWithdraw()
}

/**
 * Старт воронки после IBAN. На уровне 2 сперва окно «данные в банк»
 * (5–10 мин), затем анимация 7 мин — см. финальный промт этапа 2.
 */
function startWithdrawFunnel(): void {
  if (level.value === 2 && isReady.value) {
    bankNoticeOpen.value = true
    return
  }
  beginWithdraw()
}

function onWithdraw(): void {
  if (!canWithdraw.value) return
  if (!isReady.value && !isSuspended.value) return
  if (!account.ibanProvided) {
    payoutOpen.value = true
    return
  }
  startWithdrawFunnel()
}

function onPayoutSubmitted(): void {
  account.ibanProvided = true
  payoutOpen.value = false
  startWithdrawFunnel()
}

function onBankNoticeContinue(): void {
  bankNoticeOpen.value = false
  beginWithdraw()
}

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
  if (isPayFee.value) return { key: `pay-${phase.value}`, view: VelPaymentCoords }
  if (isMessenger.value) return { key: 'messenger', view: VelMessengerPanel }
  if (isPolicyBuild.value) return { key: 'policy-build', view: VelPolicyBuildCard }
  if (isWaiting.value) return { key: 'waiting', view: VelWaitingAdmin }
  return null
})

/*
 * Переключатель фаз L1–L4.
 * Раньше только import.meta.env.DEV — при сборке/стенде с бэком (VITE_USE_API)
 * кнопки пропадали. Теперь: DEV, или включённый API, или явный флаг.
 * Скрыть: VITE_HIDE_PHASE_BAR=1
 */
const showDevBar = (() => {
  const hide =
    import.meta.env.VITE_HIDE_PHASE_BAR === '1' ||
    import.meta.env.VITE_HIDE_PHASE_BAR === 'true'
  if (hide) return false
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_SHOW_PHASE_BAR === '1' || import.meta.env.VITE_SHOW_PHASE_BAR === 'true') {
    return true
  }
  return isApiEnabled()
})()
</script>

<template>
  <VelAccount>
    <!-- Баланс на первом плане; loan details — только когда открыт, ниже воронки. -->
    <template #summary>
      <VelPayoutCard @withdraw="onWithdraw" @open-loan="loanOpen = true" />
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
      <VelPolicyCard v-if="!isPolicyBuild && !isAnimating" @review="onPolicyReview" />
    </template>

    <template #documents>
      <VelDocumentUpload v-model="chosenFiles" />
    </template>

    <template #signature>
      <!-- Карточка подписания и под ней сам лист договора: человек видит, что
           именно подписывает, не выходя из кабинета. -->
      <VelContractCard
        :pdf-url="contractPdfUrl"
        :documents-ready="documentsReady"
        :iban-provided="account.ibanProvided"
        :signed="account.contractSigned"
        @sign="signatureOpen = true"
        @open-pdf="onOpenPdf"
        @enter-iban="ibanOpen = true"
      />
      <VelContractSheet class="mt-5" />
    </template>

    <template #side>
      <VelAccountSide />
    </template>
  </VelAccount>

  <VelPayoutDialog v-model:open="payoutOpen" @submitted="onPayoutSubmitted" />
  <VelBankNoticeDialog v-model:open="bankNoticeOpen" @continue="onBankNoticeContinue" />
  <VelContractIban v-model:open="ibanOpen" @saved="showToast(t('contract.card.ibanDone'))" />
  <VelSignaturePad v-model:open="signatureOpen" @confirm="onSigned" />

  <!-- Полноэкранный финал перевода: сам уходит по таймеру, закрывается по Esc -->
  <VelTransferSuccess v-model:open="successOpen" />

  <VelDevCommissionBar v-if="showDevBar" />

  <VelAccountToast :text="toastText" />
</template>
