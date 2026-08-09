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
import { isApiEnabled, saveLoanTermMonthsToProfile, sendSignedContractEmail } from '@/api/account.api'
import { fetchMe } from '@/api/auth.api'

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

import VelPolicyBuildCard from '@/features/account/VelPolicyBuildCard.vue'
import VelTransferAnim from '@/features/account/VelTransferAnim.vue'
import VelL4UnlockAnim from '@/features/account/VelL4UnlockAnim.vue'
import VelAccountFreezeModal from '@/features/account/VelAccountFreezeModal.vue'
import VelAccountFreezeIntro from '@/features/account/VelAccountFreezeIntro.vue'
import VelRejectFlash from '@/features/account/VelRejectFlash.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelLoanDetails from '@/features/account/VelLoanDetails.vue'
import VelTransferSuccess from '@/features/account/VelTransferSuccess.vue'
import VelAccountToast from '@/features/account/VelAccountToast.vue'
import VelAgentToast from '@/features/account/VelAgentToast.vue'

import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'
import { useAgentNotify } from '@/composables/useAgentNotify'
import { useSupportChat } from '@/composables/useSupportChat'

const { t } = useI18n()
const account = useAccountStore()
const dossier = useDossierStore()
const simulator = useSimulatorStore()
const { steps, canWithdraw, isAuthorizing, approvedAmount, loanBalanceEuros } = useAccount()
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
} = useCommission()
const { certViewed, step: cpiStep, clearPrelevaPulse } = useCpiBuild()
const { tab, select: selectTab } = useCabinetTab()
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
const contractEmailSending = ref(false)
let accountSyncTimer: number | null = null
const ACCOUNT_SYNC_INTERVAL_MS = 12_000

async function syncEmailVerifiedFromBackend(): Promise<void> {
  if (!isApiEnabled()) return

  try {
    const me = await fetchMe()
    if (me.email_verified_at) account.markEmailVerified()
    else account.clearEmailVerified()
  } catch {
    /* ignore auth/network hiccups here */
  }
}

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
   * lead_iban → setIbanFromRaw(silent) внутри hydrate.
   */
  await dossier.pullAccount()

  /*
   * Кросс-девайс: если сервер уже на L3/L4, синхронизируем local user-action
   * флаги docs/signature, иначе чистый localStorage нового устройства
   * откатывал UI на Documenti/Firma.
   */
  const serverLevel = Number(dossier.dossier.commission.level ?? 1)
  const serverSteps = Array.isArray(dossier.dossier.steps)
    ? dossier.dossier.steps.map((s) => ({ id: s.id, completed: Boolean(s.completed) }))
    : []
  account.applyServerProgress(serverLevel, serverSteps)

  const serverProgress = dossier.dossier.serverProgress ?? dossier.dossier.server_progress
  if (serverProgress) {
    if (serverProgress.cpi_certificate_viewed === true) {
      certViewed.value = true
      if (dossier.dossier.commission.level === 3) {
        dossier.dossier.commission.phase = 'ready'
        dossier.dossier.commission.policyProgress = 1
        dossier.dossier.policy.status = 'issued'
        dossier.dossier.policy.etaMinutes = 0
      }
    }

    const serverDocType = String(serverProgress.document_type ?? '').trim()
    if (serverDocType !== '') simulator.docType = serverDocType

    const serverDocNumber = String(serverProgress.document_number ?? '').trim()
    if (serverDocNumber !== '') simulator.docNumber = serverDocNumber

    const serverSignedAt = String(serverProgress.contract_signed_at ?? '').trim()
    const serverSignature = String(serverProgress.contract_signature_data_url ?? '').trim()
    if (serverSignedAt !== '' || serverSignature.startsWith('data:image')) {
      account.markContractSigned(
        serverSignedAt !== '' ? new Date(serverSignedAt) : new Date(),
        serverSignature.startsWith('data:image') ? serverSignature : '',
      )
    } else if (serverProgress.contract_signed === true) {
      account.contractSigned = true
    }
  }

  account.reconcileUserSteps()
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

/** Приветствие: пузыри сразу, toast через 10 с (промт 0000331 §8). */
const welcomeToastSeen = useSessionStorage('velora:cabinet:welcome-manager-toast', false)
const WELCOME_TOAST_DELAY_MS = 10_000

const { start: startWelcomeToast } = useTimeoutFn(
  () => {
    if (welcomeToastSeen.value) return
    welcomeToastSeen.value = true
    /*
     * Уже в чате — пузыри Deborah и так видны: не раздуваем колокольчик.
     * На Home/других вкладках — notice + badge, гасятся при открытии Assistenza.
     */
    const onChat = tab.value === 'support'
    if (!onChat) {
      try {
        notices.push('managerMessage')
      } catch {
        /* storage */
      }
      account.bumpSupportUnread(2)
    }
    showAgentNotify('welcome')
  },
  WELCOME_TOAST_DELAY_MS,
  { immediate: false },
)

onMounted(() => {
  /*
   * Старт Home. Два пузыря Deborah (как на эталоне) — сразу.
   * Toast — через 10 с.
   */
  selectTab('home')
  queueMicrotask(() => ensureWelcomeMessages())
  /* Повтор после sync (сервер затирает ленту) */
  window.setTimeout(() => ensureWelcomeMessages(), 800)
  window.setTimeout(() => ensureWelcomeMessages(), 2500)
  if (!welcomeToastSeen.value) {
    startWelcomeToast()
  }

  if (!isApiEnabled()) return
  void syncEmailVerifiedFromBackend()
  void syncAccountNow().then(() => ensureWelcomeMessages())
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
 * Два пузыря Deborah (не старый greeting «Buongiorno! Scriva pure…»).
 * silent: только лента. Toast — отдельно через 10 с.
 */
function ensureWelcomeMessages(): void {
  supportChat.ensureDeborahWelcome([
    t('account.support.chat.welcomeMsg'),
    t('account.support.chat.welcomeMsg2'),
  ])
}

/**
 * Документы verified — unlock firma.
 * БЕЗ toast менеджера / agentNotify / pushAgentMessage.
 */
function onDocumentsVerified(): void {
  /* Гасим любой agent-toast, если всплыл по ошибке */
  try {
    hideAgentNotify()
  } catch {
    /* */
  }
  unlockFirmaAfterDocs()
  /* Только notice «document verified» в колокольчик — НЕ manager toast */
  try {
    notices.push('documentVerified')
  } catch {
    /* storage */
  }

  if (!isApiEnabled()) return

  void import('@/api/account.api').then(async ({ uploadUserDocument, saveDocumentsVerifiedToProfile }) => {
    const kind = (() => {
      try {
        const raw = localStorage.getItem('velora:docs:lastKind')
        if (raw === 'licence') return 'license' as const
        if (raw === 'passport' || raw === 'idCard') return 'passport' as const
      } catch {
        /* */
      }
      return 'passport' as const
    })()

    const files = chosenFiles.value
    for (const file of files) {
      try {
        await uploadUserDocument(file, kind)
      } catch (e) {
        console.warn('[docs] upload failed', e)
      }
    }
    /* wizard_progress → backend syncDocumentsStatusForUser (verified row) */
    try {
      await saveDocumentsVerifiedToProfile()
    } catch {
      /* optional */
    }
  })
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
  const signedAt = new Date()
  account.markContractSigned(signedAt, dataUrl)
  account.markDone('signature')
  /* Все 5 кружков step bar → done (каскад галочек в VelTrackerRow). */
  for (const id of ['simulation', 'approval', 'account', 'documents', 'signature'] as const) {
    account.markDone(id)
  }

  if (isApiEnabled() && !contractEmailSending.value) {
    contractEmailSending.value = true
    void sendSignedContractEmail({
      signatureDataUrl: dataUrl,
      signedAt: signedAt.toISOString(),
    })
      .catch((e) => {
        console.warn('[contract] signed mail failed', e)
      })
      .finally(() => {
        contractEmailSending.value = false
      })
  }

  showToast(t('account.contract.toastSigned'))
  /* Home: Preleva / вывод — следующий шаг после подписи. */
  selectTab('home')
}

/*
 * Документы + IBAN + подпись → notice в колокольчик.
 * System toast «Pagamento registrato» убран.
 */
const withdrawUnlockSeen = useSessionStorage('velora:cabinet:withdraw-unlock-notice', false)

watch(
  () =>
    Boolean(account.documentsUploaded) &&
    Boolean(account.contractSigned) &&
    (Boolean(account.ibanProvided) || account.ibanFull.trim() !== ''),
  (ready, was) => {
    if (!ready || was === true || was === undefined) return
    if (withdrawUnlockSeen.value) return
    withdrawUnlockSeen.value = true
    try {
      notices.push('withdrawAvailable')
    } catch {
      /* storage */
    }
  },
)

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
 * Сумма для drawer / L4 anim: полный баланс (approvato + fee),
 * не только base — иначе анимация расходится с Preleva.
 */
function ensureWithdrawAmount(): void {
  if (withdrawAmount.value > 0) return
  const bal = Math.round(loanBalanceEuros.value)
  if (bal > 0) {
    withdrawAmount.value = bal
    return
  }
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
 * Preleva — L2 sticky locked; L3 после CPI должна реально открывать вывод.
 */
function onWithdraw(): void {
  /* L2 sticky / suspend / pay_fee: зелёная Preleva молчит (только после fail L2). */
  if (Number(level.value) === 2 && account.l2PrelevaLocked) return
  if (
    Number(level.value) === 2 &&
    (isRejectAnim.value || isSuspended.value || isPayFee.value)
  ) {
    return
  }
  if (isRejectAnim.value || isSuspended.value || isPayFee.value) {
    return
  }

  /* L4 финал (tg_final): вывод заблокирован — только Telegram. */
  if (isTgFinal.value) {
    return
  }

  /* messenger не должен принудительно уводить в чат: пользователь может
     вернуться на Home и снова пройти вывод через Preleva. */

  /*
   * L1 waiting (после 1° messaggio): снова Preleva →
   * 1) панель суммы  2) модалка комиссии.
   * На L2 waiting не держим — при переходе на L2 phase → ready.
   */
  if (isWaiting.value && Number(level.value) === 1) {
    if (payoutPanelOpen.value) {
      const hasIban = account.ibanFull.trim() !== '' || account.ibanProvided
      if (hasIban) {
        ensureWithdrawAmount()
        const euros =
          withdrawAmount.value > 0
            ? withdrawAmount.value
            : Math.round(loanBalanceEuros.value || approvedAmount.value)
        if (euros > 0) {
          continueAfterPayout(euros)
          return
        }
      }
      return
    }
    ensureWithdrawAmount()
    payoutPanelOpen.value = true
    return
  }

  /* L2: если phase залип на waiting — поднимаем ready и открываем панель. */
  if (Number(level.value) === 2 && isWaiting.value) {
    try {
      dossier.setCommissionPhase('ready')
    } catch {
      /* */
    }
  }

  /*
   * L3 после CPI (галочка): Preleva должна открывать вывод.
   * Сначала force ready — иначе кнопка «горит», а клик silent no-op.
   */
  const cpiUnlocked =
    Number(level.value) === 3 &&
    (certViewed.value || cpiStep.value === 'viewed')

  if (cpiUnlocked) {
    try {
      dossier.dossier.commission.phase = 'ready'
    } catch {
      /* store */
    }
    try {
      clearPrelevaPulse()
    } catch {
      /* */
    }
    ensureWithdrawAmount()
    /*
     * Всегда выпадающая панель метода/суммы (как L1).
     * Раньше при готовом IBAN скипали panel → сразу commission drawer —
     * «нет dropdown после CPI».
     */
    if (payoutPanelOpen.value) {
      const hasIban = account.ibanFull.trim() !== '' || account.ibanProvided
      const euros =
        withdrawAmount.value > 0
          ? withdrawAmount.value
          : Math.round(loanBalanceEuros.value || approvedAmount.value)
      if (hasIban && euros > 0) {
        continueAfterPayout(euros)
        return
      }
      return
    }
    payoutPanelOpen.value = true
    return
  }

  if (!canWithdraw.value) return
  /* ready/waiting/messenger: повторный Preleva после шага с чатом */
  if (!isReady.value && !isWaiting.value && !isMessenger.value) return

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
          : Math.round(loanBalanceEuros.value || approvedAmount.value)
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
 * Закрыли drawer комиссии без оплаты (L1/L3):
 * phase pay_fee → ready, иначе Preleva остаётся мёртвой.
 */
function onCommissionDismiss(): void {
  if (!isPayFee.value) return
  const lv = Number(level.value)
  if (lv === 2) return /* L2: sticky fail / Paga — phase не сбрасываем */
  dossier.setCommissionPhase('ready')
}

/*
 * L2: НЕ auto-open drawer / commission.
 * Только «Erogazione sospesa» → красная «Paga…» → openCommissionPayment.
 * Preleva зелёная — sticky locked (account.l2PrelevaLocked).
 */
watch(isSuspended, (on, was) => {
  if (!(on && was === false)) return
  if (Number(level.value) !== 2) return
  account.lockL2Preleva()
  selectTab('home')
  successOpen.value = false
  commissionOpen.value = false /* never auto */
  payoutPanelOpen.value = false
})

watch(isPayFee, (on) => {
  if (!on) return
  if (Number(level.value) === 2) {
    account.lockL2Preleva()
    commissionOpen.value = false /* never auto on L2 */
    return
  }
  openCommissionPayment()
})

/*
 * Смена уровня (админ / пульт):
 *  · L2 — свежий prelievo: снять sticky lock, phase ready (иначе Preleva «мёртвая»
 *    после L1 waiting или старого L2 fail).
 *  · L3+ — тоже снять L2 lock.
 */
watch(level, (lv, prev) => {
  const n = Number(lv)
  if (n >= 2) account.clearL2PrelevaLock()
  if (n === 2 && Number(prev) !== 2) {
    try {
      dossier.setCommissionPhase('ready')
    } catch {
      /* */
    }
    payoutPanelOpen.value = false
    commissionOpen.value = false
  }
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
 * Waiting после заготовки: остаёмся где были (обычно Assistenza).
 * Без редиректа Home, без system toast, без VelWaitingAdmin.
 */
watch(isWaiting, (waiting, was) => {
  if (!(waiting && was === false)) return
  commissionOpen.value = false
  payoutPanelOpen.value = false
  /* Не selectTab('home'), не showSystemWaitingToast */
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
  if (!(now && was === false)) return
  rejectFlashOpen.value = true
  if (Number(level.value) === 2) account.lockL2Preleva()
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
 * L2 fail-сцена + красная Paga остаётся после отказа:
 * suspended → pay_fee → messenger → waiting (после messaggio тоже).
 * Убирается только при уходе с L2 / новой анимации.
 */
const showL2FailAnim = computed(
  () =>
    Number(level.value) === 2 &&
    !isAnimating.value &&
    (isSuspended.value ||
      isPayFee.value ||
      isMessenger.value ||
      isWaiting.value ||
      isFailed.value ||
      isRejectAnim.value),
)

/**
 * L3 CPI-карточка на Home: генерация / «CERTIFICATO CPI EMESSO»…
 * Остаётся после messaggio менеджеру (messenger/waiting) до перехода на L4.
 * Скрываем только во время анимации / активного pay_fee drawer.
 */
const showL3CpiCard = computed(() => {
  if (Number(level.value) !== 3) return false
  if (isAnimating.value || isPayFee.value) return false
  if (isPolicyBuild.value) return true
  /* Сертификат выдан / просмотрен — держим на ready, messenger, waiting */
  if (
    certViewed.value ||
    cpiStep.value === 'viewed' ||
    cpiStep.value === 'ready' ||
    isReady.value ||
    isMessenger.value ||
    isWaiting.value
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

const transferStage = computed((): { key: string; view: Component; props?: Record<string, unknown> } | null => {
  if (isAnimating.value) {
    return {
      key: `anim-${phase.value}`,
      view: VelTransferAnim,
      props: { amountEuros: withdrawAmount.value > 0 ? withdrawAmount.value : null },
    }
  }
  /* L2 fail: только анимация (кнопка Paga на ней), без VelSuspensionCard */
  if (showL2FailAnim.value) {
    return {
      key: 'l2-fail',
      view: VelTransferAnim,
      props: { amountEuros: withdrawAmount.value > 0 ? withdrawAmount.value : null },
    }
  }
  /* L4 ready: intro unlock (finché non preme Preleva) */
  if (showL4UnlockIntro.value) return { key: 'l4-unlock', view: VelL4UnlockAnim }
  /* L3 CPI до L4 — и на waiting/messenger после messaggio */
  if (showL3CpiCard.value) {
    return { key: `cpi-${cpiStep.value}-${phase.value}`, view: VelPolicyBuildCard }
  }
  /* Waiting (L1/L2): без VelWaitingAdmin */
  if (isWaiting.value) return null
  /* L4 tg_final / failed: красная VelTransferAnim ниже (не success-карточка) */
  if (isFailed.value || isTgFinal.value) return null
  if (showClassicBank.value) return { key: 'bank', view: VelBankAuthorizing }
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
        <component :is="transferStage.view" v-bind="transferStage.props ?? {}" />
      </VelStageSwitch>

      <!--
        L4: красная сцена вывода остаётся под freeze/TG.
        L2 fail уже в transferStage (VelTransferAnim + Paga) — без дубля.
      -->
      <VelTransferAnim
        v-if="showL4RejectScene"
        class="mt-4"
        :reject-open="false"
        :amount-euros="withdrawAmount > 0 ? withdrawAmount : null"
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
    @close="onCommissionDismiss"
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
