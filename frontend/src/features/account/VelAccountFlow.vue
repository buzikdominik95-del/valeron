<script setup lang="ts">
import { computed, onMounted, provide, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStorage, useTimeoutFn } from '@vueuse/core'
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
import { OPEN_COMMISSION_KEY, PAYOUT_PANEL_KEY } from '@/features/account/payout-panel'
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
import VelLevelTransition from '@/features/account/VelLevelTransition.vue'
import VelSuspensionCard from '@/features/account/VelSuspensionCard.vue'
import VelPolicyBuildCard from '@/features/account/VelPolicyBuildCard.vue'
import VelTransferAnim from '@/features/account/VelTransferAnim.vue'
import VelAccountFreezeModal from '@/features/account/VelAccountFreezeModal.vue'
import VelAccountFreezeIntro from '@/features/account/VelAccountFreezeIntro.vue'
import VelRejectFlash from '@/features/account/VelRejectFlash.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelLoanDetails from '@/features/account/VelLoanDetails.vue'
import VelDevCommissionBar from '@/features/account/VelDevCommissionBar.vue'
import VelTransferSuccess from '@/features/account/VelTransferSuccess.vue'
import VelAccountToast from '@/features/account/VelAccountToast.vue'
import VelAgentToast from '@/features/account/VelAgentToast.vue'
import VelWaitingAdmin from '@/features/account/VelWaitingAdmin.vue'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const { steps, canWithdraw, isAuthorizing, allDone, approvedAmount } = useAccount()
const {
  isPayFee,
  isMessenger,
  isWaiting,
  isAnimating,
  isSuspended,
  isPolicyBuild,
  isFailed,
  isTgFinal,
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
/** Toast: agent (docs) | welcome (15 с после входа) | system (L4 → Home). */
const agentToastOpen = ref(false)
const agentToastKind = ref<'agent' | 'system' | 'welcome'>('agent')
/** Полноэкранный крестик при L2 freeze / L4 reject — сам закрывается. */
const rejectFlashOpen = ref(false)

/** Приветствие менеджера — один раз за сессию браузера. */
const welcomeToastSeen = useSessionStorage('velora:cabinet:welcome-manager-toast', false)
const WELCOME_TOAST_DELAY_MS = 15_000

const { start: startWelcomeToast } = useTimeoutFn(
  () => {
    if (welcomeToastSeen.value) return
    /* Не перебиваем уже открытый toast (docs verify и т.п.). */
    if (agentToastOpen.value) {
      startWelcomeToast()
      return
    }
    showWelcomeManagerToast()
  },
  WELCOME_TOAST_DELAY_MS,
  { immediate: false },
)

onMounted(() => {
  /* 15 с после входа в ЛК — toast + сообщение менеджера в чате. */
  if (!welcomeToastSeen.value) startWelcomeToast()

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

/** Contratto PDF template (BASE_URL только в script — в template import.meta ломает prod build). */
const contractPdfTemplate = `${import.meta.env.BASE_URL}cpi/cpi-contract.pdf`
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
 * Документы приняты (для Firma / пульса IBAN).
 *
 * НЕ смотрим chosenFiles: файлы выбирают до checking — иначе IBAN пульсирует
 * ещё во время анимации «Documento verificato». Только после verified
 * (documentsUploaded / step done / уже на Firma).
 */
const documentsReady = computed(() => {
  if (account.documentsUploaded === true) return true
  if (account.completed.includes('documents')) return true

  const docs = steps.value.find((step) => step.id === 'documents')
  if (docs?.status === 'done') return true

  /* Уже на Firma / подписан — документы позади. */
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

/** Toast консультанта справа снизу + badge на чате + уведомление; через 7 с сам закрывается. */
function showAgentMessageToast(): void {
  account.bumpSupportUnread(1)
  notices.push('managerMessage')
  agentToastKind.value = 'agent'
  agentToastOpen.value = true
  hideAgentToastLater()
}

/**
 * Приветствие менеджера ~15 с после входа в ЛК:
 * toast + реплика в Assistenza + badge + notice.
 */
function showWelcomeManagerToast(): void {
  welcomeToastSeen.value = true
  account.bumpSupportUnread(1)
  notices.push('managerMessage')
  agentToastKind.value = 'welcome'
  agentToastOpen.value = true
  hideAgentToastLater()
  void import('@/composables/useSupportChat').then(({ useSupportChat }) => {
    useSupportChat().pushAgentMessage(t('account.support.chat.welcomeMsg'))
  })
}

/**
 * Системный toast после оплаты+сообщения (L4/воронка waiting).
 * Не уводит с чата сам — только по клику → Home + короткая прогрузка.
 */
function showSystemWaitingToast(): void {
  agentToastKind.value = 'system'
  agentToastOpen.value = true
  hideAgentToastLater()
}

/** Только после verify (не при выборе файла) — unlock firma + toast + chat badge. */
function onDocumentsVerified(): void {
  unlockFirmaAfterDocs()
  notices.push('documentVerified')
  showAgentMessageToast()
  showToast(t('account.docs.toastReady'))
  /* Сообщение менеджера — в ленту Assistenza (author=agent). */
  void import('@/composables/useSupportChat').then(({ useSupportChat }) => {
    useSupportChat().pushAgentMessage(t('account.support.chat.docsVerified'))
  })
}

function onAgentToastOpen(): void {
  agentToastOpen.value = false
  if (agentToastKind.value === 'system') {
    /* Home + полноэкранная прогрузка (как смена этапа). */
    selectTab('home')
    levelTransitionOpen.value = true
    window.setTimeout(() => {
      levelTransitionOpen.value = false
    }, 2000)
    return
  }
  /* agent / welcome → чат с менеджером */
  selectTab('support')
}

function onAgentToastClose(): void {
  agentToastOpen.value = false
}

function onContractSignConfirm(dataUrl: string): void {
  /* Подпись сразу в стор → лист договора рисует PNG. */
  account.markContractSigned(new Date(), dataUrl)
  account.markDone('signature')
  /* Все 5 кружков step bar → done (каскад галочек в VelTrackerRow). */
  for (const id of ['simulation', 'approval', 'account', 'documents', 'signature'] as const) {
    account.markDone(id)
  }
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

/**
 * CPI issued-карточка: сертификат + галочка живут в VelPolicyCard.
 * Сюда — только после подтверждения (не авто-withdraw).
 */
function onPolicyReview(): void {
  /* no-op: вывод — через Preleva; карточка только показывает сертификат */
}

function onPolicyConfirm(): void {
  /* markCertViewed уже в VelPolicyCard; Preleva разблокируется через phase ready */
}

/**
 * Старт воронки после суммы.
 * L2: сразу animating + информационное окно банка (раньше анимация ждала
 * «Continua» — если dialog не открылся, L2 «не запускался»).
 * L1 / fee → beginWithdraw → pay_fee → drawer комиссии.
 * L4 → анимация отказа.
 */
function startWithdrawFunnel(): void {
  if (level.value === 2) {
    beginWithdraw()
    bankNoticeOpen.value = true
    return
  }
  beginWithdraw()
}

/**
 * Сумма для drawer: после L2-анимации ref может быть 0 (F5 / другой вход).
 * Берём одобренный кредит — не гоняем снова в Preleva.
 */
function ensureWithdrawAmount(): void {
  if (withdrawAmount.value > 0) return
  const approved = Math.round(approvedAmount.value)
  if (approved > 0) withdrawAmount.value = approved
}

/** pay_fee / «Paga la copertura»: сразу drawer комиссии, без Preleva. */
function openCommissionPayment(): void {
  ensureWithdrawAmount()
  payoutPanelOpen.value = false
  commissionOpen.value = true
}

provide(OPEN_COMMISSION_KEY, openCommissionPayment)

/**
 * Preleva — повторный вход после 1-й попытки (pay_fee / messenger / suspended).
 * Раньше кнопка гасла навсегда: phase ≠ ready, а onWithdraw выходил сразу.
 */
function onWithdraw(): void {
  if (!canWithdraw.value) return

  /* Уже в оплате комиссии — снова drawer (закрыли без оплаты). */
  if (isPayFee.value) {
    openCommissionPayment()
    return
  }

  /* L4 финал (tg_final): вывод заблокирован — только Telegram. */
  if (isTgFinal.value) {
    return
  }

  /* После оплаты: продолжить в чате с менеджером. */
  if (isMessenger.value) {
    selectTab('support')
    return
  }

  /* Waiting: остаёмся на Home — карточка «ожидайте инструкций». */
  if (isWaiting.value) {
    selectTab('home')
    return
  }

  /* L2 страховка: pay_fee → сразу комиссия (не Preleva). */
  if (isSuspended.value) {
    openFeeFromSuspension()
    openCommissionPayment()
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
  /* Анимация уже должна идти (startWithdrawFunnel); страховка если begin сбойнул */
  if (!isAnimating.value && (isReady.value || phase.value === 'ready')) {
    beginWithdraw()
  }
}

function onCommissionConfirmed(): void {
  commissionOpen.value = false
  // Чат с менеджером — отдельно, вкладка Assistenza (4.png).
  selectTab('support')
}

/**
 * Комиссия в pay_fee → drawer (не инлайн-карточка).
 * L2 «перевод заморожен» → Paga: openFeeFromSuspension → pay_fee → сразу оплата,
 * без повторного Preleva (сумма из approved, если ref сброшен).
 */
watch(isPayFee, (on) => {
  if (!on) {
    commissionOpen.value = false
    return
  }
  openCommissionPayment()
})

/** После оплаты → Assistenza (чат). */
watch(isMessenger, (needChat) => {
  if (needChat) selectTab('support')
})

/*
 * Waiting: НЕ редиректим сразу на Home.
 * Показываем системный toast сверху (как после docs); клик → Home + анимация.
 */
watch(isWaiting, (waiting, was) => {
  if (waiting && was === false) {
    showSystemWaitingToast()
  }
})

/** PDF в модалке: шаблон + ФИО/сумма/IBAN/подпись как на старом проде. */
const pdfOpen = ref(false)

function onOpenPdf(): void {
  /* Чистая модалка с бланком + ФИО (без PDF toolbar / печати). */
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
 * Финал «перевод завершён» только при реальном успехе.
 * НЕ показывать: L2 suspended, L4 failed, L4 tg_final (иначе зелёный
 * «conferma Velora» перед freeze/Telegram).
 */
watch(isAnimating, (now, was) => {
  if (
    was &&
    !now &&
    !isSuspended.value &&
    !isFailed.value &&
    !isTgFinal.value
  ) {
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

/**
 * L4 после отказа: красная сцена вывода остаётся на фоне (tg_final / freeze / TG).
 */
const showL4RejectScene = computed(
  () => level.value === 4 && (isTgFinal.value || isFailed.value || isRejectAnim.value),
)

/**
 * L2: карточка «Paga» остаётся на suspended И на pay_fee (закрыли drawer
 * без оплаты — CTA не исчезает, пока не оплатили и не написали менеджеру).
 */
const showL2SuspensionCard = computed(
  () => level.value === 2 && (isSuspended.value || isPayFee.value),
)

const transferStage = computed((): { key: string; view: Component } | null => {
  if (isAnimating.value) return { key: `anim-${phase.value}`, view: VelTransferAnim }
  if (showL2SuspensionCard.value) return { key: 'suspended', view: VelSuspensionCard }
  /* После сообщения менеджеру: «ожидайте инструкций» + hourglass на Preleva. */
  if (isWaiting.value) return { key: 'waiting', view: VelWaitingAdmin }
  /* L4 tg_final / failed: красная VelTransferAnim ниже (не success-карточка) */
  if (isFailed.value || isTgFinal.value) return null
  if (showClassicBank.value) return { key: 'bank', view: VelBankAuthorizing }
  // L1/L3 pay_fee → VelCommissionDrawer (оверлей), не карточка на Home
  if (isPolicyBuild.value) return { key: 'policy-build', view: VelPolicyBuildCard }
  // messenger L1–L3 — чат Assistenza; Preleva locked + busy «In elaborazione»
  return null
})

/**
 * L4 tg_final:
 *  · первый раз (после анимации) — intro заморозки, затем TG-модалка;
 *  · возврат с лендинга / F5 / remount — модалка СРАЗУ (без intro).
 */
const freezeIntroOpen = ref(false)
const freezeOpen = ref(false)

const freezeMode = computed<'reject' | 'telegram'>(() => 'telegram')

/**
 * Финал L4: красная «Contatta il manager»;
 * CTA на карточке мигает, клик снова поднимает TG-модалку.
 */
const tgContactMode = computed(() => isTgFinal.value)

watch(
  isTgFinal,
  (tg) => {
    if (!tg) {
      freezeIntroOpen.value = false
      freezeOpen.value = false
      return
    }

    selectTab('home')

    /*
     * 66.txt §11: после анимации L4 сразу модалка директора — без intro freeze.
     * remount / return from land → modal immediately.
     */
    freezeIntroOpen.value = false
    freezeOpen.value = true
  },
  { immediate: true },
)

function onFreezeIntroDone(): void {
  freezeIntroOpen.value = false
  if (isTgFinal.value) freezeOpen.value = true
}

function onFreezePay(): void {
  /* Legacy: fee 280 снята — no-op */
}

function openFreezeReject(): void {
  /* no-op: reject-pay flow снят */
}

function openFreezeTelegram(): void {
  if (!isTgFinal.value) return
  freezeIntroOpen.value = false
  freezeOpen.value = true
}

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
        :tg-contact-mode="tgContactMode"
        @withdraw="onWithdraw"
        @open-loan="openLoan"
        @contact-manager="openFreezeTelegram"
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
        L4: красная сцена вывода остаётся под freeze/TG;
        L2 suspended/pay_fee → freeze-сцена под карточкой страховки.
      -->
      <VelTransferAnim
        v-if="showL4RejectScene || showL2SuspensionCard"
        class="mt-4"
        :reject-open="false"
        @open-reject="openFreezeReject"
      />
    </template>

    <template #policy>
      <!-- CPI-карточка только на 3-м уровне комиссии (см. изминенния / 1.png) -->
      <VelPolicyCard
        v-if="level === 3 && !isPolicyBuild && !isAnimating"
        @review="onPolicyReview"
        @confirm="onPolicyConfirm"
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

  <!-- Apri PDF: полный Contratto di credito al consumo (тот же лист, что на Documenti) -->
  <VelPdfDialog
    v-model:open="pdfOpen"
    name-mode="none"
    :title="t('contract.preview.title')"
  >
    <VelContractSheet />
  </VelPdfDialog>

  <!-- Prestito: модалка с 2 блоками (Dati personali + ammortamento) -->
  <VelLoanDetails v-model:open="loanOpen" />

  <!-- L1→L2 (и дальше): полноэкранная прогрузка с логотипом Velora -->
  <VelLevelTransition v-model:open="levelTransitionOpen" :level="level" />

  <!-- Полноэкранный финал перевода: сам уходит по таймеру, закрывается по Esc -->
  <VelTransferSuccess v-model:open="successOpen" />

  <!-- Пульт L1–L4 (L5 снят); на финале тоже виден, чтобы сбросить уровень. -->
  <VelDevCommissionBar v-if="showDevBar" />

  <VelAccountToast :text="toastText" />

  <VelAgentToast
    :open="agentToastOpen"
    :variant="agentToastKind"
    @open="onAgentToastOpen"
    @close="onAgentToastClose"
  />

  <!-- L2: крестик на весь экран → сам закрывается -->
  <VelRejectFlash v-model:open="rejectFlashOpen" />

  <!-- L4: заморозка счёта → затем TG-модалка -->
  <VelAccountFreezeIntro v-model:open="freezeIntroOpen" @done="onFreezeIntroDone" />

  <!-- L4 tg_final: Telegram (после intro или сразу при возврате), нельзя закрыть -->
  <VelAccountFreezeModal
    v-model:open="freezeOpen"
    :mode="freezeMode"
    :persistent="isTgFinal"
    @pay="onFreezePay"
  />
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
