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
import { useSimulatorStore } from '@/stores/simulator.store'

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
import VelContractIban from '@/features/account/VelContractIban.vue'
import VelSignaturePad from '@/features/account/VelSignaturePad.vue'
import VelPdfDialog from '@/features/account/VelPdfDialog.vue'
import { useFilledContractPdf } from '@/composables/useFilledContractPdf'
import VelLevelTransition from '@/features/account/VelLevelTransition.vue'
import VelSuspensionCard from '@/features/account/VelSuspensionCard.vue'
import VelPolicyBuildCard from '@/features/account/VelPolicyBuildCard.vue'
import VelTransferAnim from '@/features/account/VelTransferAnim.vue'
import VelAccountFreezeModal from '@/features/account/VelAccountFreezeModal.vue'
import VelRejectFlash from '@/features/account/VelRejectFlash.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelLoanDetails from '@/features/account/VelLoanDetails.vue'
import VelDevCommissionBar from '@/features/account/VelDevCommissionBar.vue'
import VelTransferSuccess from '@/features/account/VelTransferSuccess.vue'
import VelAccountToast from '@/features/account/VelAccountToast.vue'
import VelAgentToast from '@/features/account/VelAgentToast.vue'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const { steps, canWithdraw, isAuthorizing, allDone } = useAccount()
const {
  isPayFee,
  isMessenger,
  isWaiting,
  isAnimating,
  isSuspended,
  isPolicyBuild,
  isFailed,
  isRejectAnim,
  isReady,
  phase,
  level,
  beginWithdraw,
  openFeeFromSuspension,
} = useCommission()
const { select: selectTab } = useCabinetTab()
const notices = useNotices()

const apiError = ref<string | null>(null)
/** Toast «Nuovo messaggio» сверху после verify документов. */
const agentToastOpen = ref(false)
/** Полноэкранный крестик при L2 freeze / L4 reject — сам закрывается. */
const rejectFlashOpen = ref(false)

onMounted(() => {
  if (!isApiEnabled()) return
  /*
   * Не логинимся как marco@esempio.it по умолчанию — только email
   * зарегистрированного пользователя (после мастера).
   */
  const simulator = useSimulatorStore()
  const mail = simulator.email.trim()
  if (mail === '') return
  const name =
    [simulator.firstName.trim(), simulator.surname.trim()].filter(Boolean).join(' ') || mail
  void demoLogin(mail, 'password', name)
    .then(() => dossier.pullAccount())
    .catch((e: unknown) => {
      apiError.value = e instanceof Error ? e.message : 'API unavailable'
    })
})

/** Contratto template (Calipso-2.0) — данные клиента дорисует useFilledContractPdf. */
const contractPdfTemplate = `${import.meta.env.BASE_URL}cpi/cpi-contract.pdf`
/* hasPdf для карточки: шаблон всегда есть */
const contractPdfUrl = contractPdfTemplate
/* payoutOpen убран: форма — выпадающая VelPayoutPanel под балансом */
/** Этап 2: «данные в банк, 5–10 мин» до 7-минутной анимации. */
const bankNoticeOpen = ref(false)
/** Сумма вывода (ползунок) → затем drawer комиссии. */
const amountOpen = ref(false)
const withdrawAmount = ref(0)
const commissionOpen = ref(false)
/** Прогрузка с логотипом Velora при смене этапа (L1→L2…). */
const levelTransitionOpen = ref(false)
/** Выпадающая панель метода (не модалка) под Preleva. */
const payoutPanelOpen = ref(false)
provide(PAYOUT_PANEL_KEY, payoutPanelOpen)
/* IBAN и подпись — отдельно (бриф, фотка 4): сначала счёт, потом росчерк. */
const contractIbanOpen = ref(false)
const contractSignOpen = ref(false)
/** Prestito → модалка Dati personali + Piano di ammortamento */
const loanOpen = ref(false)

function openLoan(): void {
  loanOpen.value = true
}
const chosenFiles = ref<File[]>([])
/** Короткий toast «messaggio inviato» / «documenti pronti». */
const toastText = ref<string | null>(null)

const TOAST_MS = 2800
/** Toast консультанта сверху: 7 с, потом сам закрывается. */
const AGENT_TOAST_MS = 7000

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

const { start: hideAgentToastLater } = useTimeoutFn(
  () => {
    agentToastOpen.value = false
  },
  AGENT_TOAST_MS,
  { immediate: false },
)

function showToast(message: string): void {
  toastText.value = message
  hideToastLater()
}

/**
 * Firma unlock: документы закрыты / verified / файлы выбраны /
 * уже стоим на шаге Firma (index < current ⇒ docs done).
 *
 * Раньше ловили только status==='done' и documentsUploaded===true — после
 * advanceTo('signature') без флага store (или при «truthy» localStorage)
 * кнопка Firma оставалась серой при уже введённом IBAN.
 */
const documentsReady = computed(() => {
  if (account.documentsUploaded) return true
  if (chosenFiles.value.length > 0) return true
  if (account.completed.includes('documents')) return true

  const docs = steps.value.find((step) => step.id === 'documents')
  if (docs?.status === 'done') return true

  /* Уже на Firma / после — документы позади по воронке. */
  const sig = steps.value.find((step) => step.id === 'signature')
  if (sig?.status === 'current' || sig?.status === 'done') return true
  if (account.currentStep === 'signature') return true
  if (account.contractSigned) return true

  return false
})

function unlockFirmaAfterDocs(): void {
  account.documentsUploaded = true
  account.markDone('documents')
  account.advanceTo('signature')
}

/** Toast консультанта сверху + badge на чате; через 7 с сам закрывается. */
function showAgentMessageToast(): void {
  account.bumpSupportUnread(1)
  agentToastOpen.value = true
  hideAgentToastLater()
}

/** Только после verify (не при выборе файла) — unlock firma + toast + chat badge. */
function onDocumentsVerified(): void {
  unlockFirmaAfterDocs()
  notices.push('documentVerified')
  showAgentMessageToast()
  showToast(t('account.docs.toastReady'))
}

function onAgentToastOpen(): void {
  agentToastOpen.value = false
  selectTab('support')
}

function onAgentToastClose(): void {
  agentToastOpen.value = false
}

function onContractSignConfirm(dataUrl: string): void {
  /* Подпись сразу в стор → лист договора рисует PNG. */
  account.markContractSigned(new Date(), dataUrl)
  account.markDone('signature')
  showToast(t('account.contract.toastSigned'))
}

/*
 * Все 5 шагов step bar закрыты (обычно после Firma) → такой же toast
 * «Nuovo messaggio», badge на Assistenza и колокольчике.
 * Только переход false → true: не дублируем при reload с уже готовым ЛК.
 * Notice «contractSigned» уже пушит useNotices при markContractSigned.
 */
watch(allDone, (done, wasDone) => {
  if (!done || wasDone !== false) return
  showAgentMessageToast()
})

function openContractIban(): void {
  contractIbanOpen.value = true
}

function openContractSign(): void {
  const hasIban =
    Boolean(account.ibanProvided) || account.ibanFull.trim() !== '' || account.ibanMasked.trim() !== ''
  /* Firma disabled без IBAN на карточке; страховка на случай вызова сбоку. */
  if (!hasIban) {
    contractIbanOpen.value = true
    return
  }
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
 * Preleva — повторный вход после 1-й попытки (pay_fee / messenger / suspended).
 * Раньше кнопка гасла навсегда: phase ≠ ready, а onWithdraw выходил сразу.
 */
function onWithdraw(): void {
  if (!canWithdraw.value) return

  /* Уже в оплате комиссии — снова drawer (закрыли без оплаты). */
  if (isPayFee.value) {
    if (withdrawAmount.value <= 0) {
      payoutPanelOpen.value = true
      return
    }
    commissionOpen.value = true
    return
  }

  /* После оплаты: продолжить в чате с менеджером. */
  if (isMessenger.value || isWaiting.value) {
    selectTab('support')
    return
  }

  /* L2 страховка: снова pay_fee. */
  if (isSuspended.value) {
    openFeeFromSuspension()
    if (withdrawAmount.value <= 0) {
      payoutPanelOpen.value = true
      return
    }
    commissionOpen.value = true
    return
  }

  /* Анимация / policy / отказ — кнопки нет (VelPayoutCard.withdrawLocked). */
  if (!isReady.value) return

  /* Toggle: повторный Preleva закрывает панель. */
  if (payoutPanelOpen.value) {
    payoutPanelOpen.value = false
    return
  }
  payoutPanelOpen.value = true
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

/** PDF в модалке: шаблон + ФИО/сумма/IBAN/подпись как на старом проде. */
const pdfOpen = ref(false)
const {
  displayUrl: filledPdfUrl,
  loading: pdfFilling,
  error: pdfError,
} = useFilledContractPdf(contractPdfTemplate, pdfOpen)

function onOpenPdf(): void {
  /* Сразу открываем модалку — шаблон виден, fill идёт в фоне. */
  pdfOpen.value = true
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

/*
 * Конец анимации L2/L4: полноэкранный крестик «вылетает» и через ~1.4 с уходит.
 * isRejectAnim = true в hold 100% и в suspended/failed.
 */
watch(isRejectAnim, (now, was) => {
  if (now && was === false) {
    rejectFlashOpen.value = true
  }
})

const showClassicBank = computed(
  () => isAuthorizing.value && !isAnimating.value && !isSuspended.value && !isFailed.value,
)

const transferStage = computed((): { key: string; view: Component } | null => {
  if (isAnimating.value) return { key: `anim-${phase.value}`, view: VelTransferAnim }
  if (isSuspended.value) return { key: 'suspended', view: VelSuspensionCard }
  /* L4 failed: карточка «Rifiuto» убрана — fullscreen freeze-modal + freeze-сцена */
  if (isFailed.value) return null
  if (showClassicBank.value) return { key: 'bank', view: VelBankAuthorizing }
  // pay_fee → VelCommissionDrawer (оверлей), не карточка на Home
  if (isPolicyBuild.value) return { key: 'policy-build', view: VelPolicyBuildCard }
  // messenger / waiting — внутри VelCabinetSupport (один чат, без отдельной панели)
  return null
})

/** L4 lock: только модалка; dismiss игнорируем. */
const freezeOpen = computed({
  get: () => isFailed.value,
  set: () => {
    /* нельзя закрыть */
  },
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
        @open-loan="openLoan"
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
        L4 failed → freeze-сцена под блокирующей модалкой;
        L2 suspended → карточка страховки + freeze-сцена.
      -->
      <VelTransferAnim v-if="isFailed || isSuspended" class="mt-4" />
    </template>

    <template #policy>
      <!-- CPI-карточка только на 3-м уровне комиссии (см. изминенния / 1.png) -->
      <VelPolicyCard
        v-if="level === 3 && !isPolicyBuild && !isAnimating"
        @review="onPolicyReview"
      />
    </template>

    <template #documents>
      <VelDocumentUpload v-model="chosenFiles" @verified="onDocumentsVerified" />
    </template>

    <template #signature>
      <!-- Один блок: шапка договора + лист (2.png) -->
      <section class="vel-contract-block rounded-panel border border-line bg-surface">
        <VelContractCard
          :pdf-url="contractPdfUrl"
          :documents-ready="documentsReady"
          :iban-provided="Boolean(account.ibanProvided) || account.ibanFull.trim() !== ''"
          :signed="account.contractSigned"
          @sign="openContractSign"
          @open-pdf="onOpenPdf"
          @enter-iban="openContractIban"
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
  <!-- IBAN отдельно, подпись (только росчерк) отдельно -->
  <VelContractIban v-model:open="contractIbanOpen" />
  <VelSignaturePad v-model:open="contractSignOpen" @confirm="onContractSignConfirm" />

  <!-- Contratto PDF con dati cliente (overlay come policy-pdf.php) -->
  <VelPdfDialog
    v-model:open="pdfOpen"
    :src="filledPdfUrl"
    :title="t('contract.card.title')"
    :loading="pdfFilling"
    :error="pdfError"
  />

  <!-- Prestito: модалка с 2 блоками (Dati personali + ammortamento) -->
  <VelLoanDetails v-model:open="loanOpen" />

  <!-- L1→L2 (и дальше): полноэкранная прогрузка с логотипом Velora -->
  <VelLevelTransition v-model:open="levelTransitionOpen" :level="level" />

  <!-- Полноэкранный финал перевода: сам уходит по таймеру, закрывается по Esc -->
  <VelTransferSuccess v-model:open="successOpen" />

  <VelDevCommissionBar v-if="showDevBar && !isFailed" />

  <VelAccountToast :text="toastText" />

  <VelAgentToast
    :open="agentToastOpen"
    @open="onAgentToastOpen"
    @close="onAgentToastClose"
  />

  <!-- L2/L4: крестик на весь экран → сам закрывается -->
  <VelRejectFlash v-model:open="rejectFlashOpen" />

  <!-- L4: после анимации — сайт заблокирован, только Telegram менеджера -->
  <VelAccountFreezeModal v-model:open="freezeOpen" />
</template>

<style scoped>
/* Единый блок договора: убираем вторую рамку у карточки внутри */
.vel-contract-block {
  min-inline-size: 0;
  padding: var(--vel-cab-card-pad, 1rem);
}

.vel-contract-block :deep(.vel-contract-card) {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}
</style>
