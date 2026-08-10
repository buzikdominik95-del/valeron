import { ApiError, request } from '@/api/http'
import { isApiSessionAlive } from '@/api/session'
import type { AccountDocument, AccountStep } from '@/stores/account.store'
import { defaultCommission } from '@/api/commission'
import type { AccountCommission, CommissionLevel } from '@/api/commission'


function envOr(value: string | undefined, fallback: string): string {
  return value === undefined || value === '' ? fallback : value
}

const API_ORIGIN = envOr(import.meta.env.VITE_API_ORIGIN, '').replace(/\/+$/, '')
const API_BASE = envOr(import.meta.env.VITE_API_BASE, '/api').replace(/\/+$/, '')

async function requestSupportMessageNoCsrf(
  payload: SupportMessageRequest,
  signal?: AbortSignal,
): Promise<{ ok: true }> {
  const response = await fetch(`${API_ORIGIN}${API_BASE}/account/messages-test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
    signal,
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  const body = text.trim() === '' ? {} : JSON.parse(text)

  if (!response.ok) {
    const shape = body as { message?: string; errors?: Record<string, string[]> }
    throw new ApiError(
      response.status,
      shape.message ?? `Запрос завершился со статусом ${response.status}`,
      shape.errors ?? {},
    )
  }

  return body as { ok: true }
}

async function requestSupportMessageMultipartNoCsrf(
  payload: SupportMessageRequest,
  file: File,
  signal?: AbortSignal,
): Promise<{ ok: true; message?: { attachment?: SupportMessageAttachment | null } }> {
  const form = new FormData()
  form.append('body', payload.body)
  form.append('kind', payload.kind)
  form.append('level', String(payload.level))
  if (payload.email) form.append('email', payload.email)
  if (payload.name) form.append('name', payload.name)
  form.append('attachment_file', file)

  const response = await fetch(`${API_ORIGIN}${API_BASE}/account/messages-test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
    signal,
    body: form,
  })

  const text = await response.text()
  const body = text.trim() === '' ? {} : JSON.parse(text)

  if (!response.ok) {
    const shape = body as { message?: string; errors?: Record<string, string[]> }
    throw new ApiError(
      response.status,
      shape.message ?? `Запрос завершился со статусом ${response.status}`,
      shape.errors ?? {},
    )
  }

  return body as { ok: true; message?: { attachment?: SupportMessageAttachment | null } }
}

export type {
  AccountCommission,
  CommissionFee,
  CommissionFeeReason,
  CommissionLevel,
  CommissionPhase,
} from '@/api/commission'
export {
  COMMISSION_ANIMATION_MS,
  COMMISSION_FEE_BY_LEVEL,
  COMMISSION_LEVELS,
  defaultCommission,
  isCommissionLevel,
} from '@/api/commission'

/**
 * Контракт личного кабинета ↔ Laravel 12 (PHP 8.4+, PostgreSQL, Redis, Reverb).
 *
 * HTTP (Sanctum cookie, см. http.ts):
 *   GET  /api/account
 *   POST /api/account/transfer
 *   POST /api/account/commission/paid
 *   POST /api/account/messages
 *   401 → сессия мертва; 422 → { message, errors }
 *
 * Realtime (Reverb): private-application.{id}, события в reverb.events.ts.
 * Полный контракт для бэкендера: BACKEND.md в корне проекта.
 *
 * JSON camelCase. Деньги — целые евроценты. Заглушка = форма ответа API.
 */

export interface AccountClient {
  firstName: string
  lastName: string
  /** Почта показывается как есть: проверять её формой кабинета нечем. */
  email: string
}

export interface AccountCredit {
  /** Одобренная партнёрами сумма в евроцентах (включая бонус уровня, если есть). */
  approvedAmountCents: number
  /** Базовая одобренная сумма без бонуса уровня. */
  baseApprovedAmountCents?: number
  /** Добавка к одобренной сумме (bonus/refund), евроценты. */
  approvedBonusCents?: number
  /** Годовая ставка TAN в процентах, например 3.8 */
  ratePercent: number
  /** Предложение ещё не открывали — над суммой горит метка «NUOVO». */
  isNew: boolean
}

/** Полис CPI: проверяется или выпущен. Третьего состояния у него нет. */
export type AccountPolicyStatus = 'processing' | 'issued'

export interface AccountPolicy {
  status: AccountPolicyStatus
  /** Сколько ещё ждать проверки, минуты. При status: 'issued' равно 0. */
  etaMinutes: number
}

/** Перевод: idle | authorizing | suspended | failed. */
export type AccountTransferStatus = 'idle' | 'authorizing' | 'suspended' | 'failed'

/**
 * Способы получения денег. Порядок задаёт порядок радиокнопок в окне вывода.
 * Идентификаторы латиницей и независимы от языка — подписи живут в локали
 * (account.payout.dialog.methods.*).
 */
export const PAYOUT_METHODS = ['iban', 'card'] as const

export type PayoutMethod = (typeof PAYOUT_METHODS)[number]

/** Страж для значения, пришедшего извне — из ответа API или из ссылки. */
export function isPayoutMethod(value: unknown): value is PayoutMethod {
  return typeof value === 'string' && (PAYOUT_METHODS as readonly string[]).includes(value)
}

export interface AccountTransfer {
  status: AccountTransferStatus
  /** Оценка ожидания авторизации, минуты. При status: 'idle' равно 0. */
  etaMinutes: number
  /**
   * Куда ушли деньги — для блока «Dettagli trasferimento».
   * null, пока перевод не запрошен.
   */
  method: PayoutMethod | null
  /**
   * Уже усечённый хвост реквизитов, последние знаки. НЕ весь номер: полных
   * реквизитов ни ответ, ни фронт не держат — показывать их на экране незачем,
   * а лишняя копия номера карты в памяти вкладки это ровно то, чего быть не
   * должно. Пустая строка — перевод не запрашивали.
   */
  accountTail: string
}

/**
 * Что уходит на сервер при запросе вывода: POST /api/account/transfer.
 * Полные реквизиты живут только внутри этого запроса и нигде не оседают.
 */
export interface PayoutTransferRequest {
  method: PayoutMethod
  /** Значащие знаки без пробелов маски: 'IT60X0542811101000000123456'. */
  account: string
  holder: string
  /**
   * Евро. Всегда равна одобренной сумме: частичного вывода интерфейс
   * не предлагает и удержаний по дороге не рисует.
   */
  amount: number
}

/**
 * Прогресс по шагу. Идентификаторы шагов уже описаны в account.store
 * (ACCOUNT_STEPS) — вторая копия списка здесь означала бы два источника
 * одного и того же порядка.
 */
export interface AccountStepProgress {
  id: AccountStep
  completed: boolean
}

export interface AccountPaymentCoordsTexts {
  lead?: string
  method?: string
  beneficiaryLabel?: string
  ibanLabel?: string
  swiftLabel?: string
  amountLabel?: string
  receiptText?: string
  confirmText?: string
}

export interface AccountPaymentCoords {
  method: string
  beneficiary: string
  iban: string
  swift: string
  amountCents: number
  texts?: AccountPaymentCoordsTexts
}

export interface AccountServerProgress {
  document_type?: string | null
  document_number?: string | null
  contract_signed?: boolean
  contract_signed_at?: string | null
  contract_signature_data_url?: string | null
  withdraw_fail_notified_at?: string | null
  cpi_certificate_viewed?: boolean
  cpi_certificate_viewed_at?: string | null
}

export interface AccountDossier {
  client: AccountClient
  credit: AccountCredit
  policy: AccountPolicy
  transfer: AccountTransfer
  /**
   * Воронка комиссий / уровней вывода. Меняет бэкенд (флаг админа + ответы
   * на оплату). Фронт не повышает level сам — только phase после действий
   * пользователя (оплата, отправка сообщения, старт анимации).
   */
  commission: AccountCommission
  /** Пройденные шаги. Порядок ответа не важен — его задаёт ACCOUNT_STEPS. */
  steps: AccountStepProgress[]
  /** Шаг, на котором заявка стоит сейчас. */
  currentStep: AccountStep
  /**
   * Документы, ПРИНЯТЫЕ сервером. Форма записи описана в account.store
   * (AccountDocument) — там же живёт список видов, и вторая копия здесь
   * означала бы два источника одного словаря.
   *
   * Файлы, выбранные в браузере (VelDocumentUpload), сюда не попадают: пока
   * они не ушли на сервер, «documento caricato» о них сказать нельзя.
   */
  documents: AccountDocument[]
  /** IBAN клиента (из leads/ibans). Фронт кладёт в account.store. */
  lead_iban?: string | null
  /** Глобальные реквизиты и сумма комиссии для текущего уровня. */
  paymentCoords?: AccountPaymentCoords
  /** Legacy snake_case от бэкенда (на время миграции). */
  payment_coords?: AccountPaymentCoords
  /** Серверная правда по документам/подписи/отказу вывода (без localStorage). */
  serverProgress?: AccountServerProgress
  /** Legacy snake_case от бэкенда (на время миграции). */
  server_progress?: AccountServerProgress
}

/**
 * Заглушка. Значения — демонстрационные, из эталонного кабинета оригинала:
 * клиент Marco Rossi, одобрено 12 400 € под 3,8%, полис CPI ещё проверяется,
 * перевод не запрошен, пройдены три шага из пяти.
 *
 * Это не «данные с сервера» и не выдумка за банк: пока бэкенда нет, кабинету
 * нужно что-то показать, и лучше честная демонстрация из ТЗ, чем пустые поля.
 */
export const ACCOUNT_DOSSIER_STUB: AccountDossier = {
  client: {
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco@esempio.it',
  },
  credit: {
    approvedAmountCents: 1_240_000,
    baseApprovedAmountCents: 1_240_000,
    approvedBonusCents: 0,
    ratePercent: 3.8,
    isNew: true,
  },
  policy: {
    status: 'processing',
    etaMinutes: 30,
  },
  transfer: {
    status: 'idle',
    etaMinutes: 60,
    method: null,
    accountTail: '',
  },
  commission: defaultCommission(1),
  steps: [
    { id: 'simulation', completed: true },
    { id: 'approval', completed: true },
    { id: 'account', completed: true },
    { id: 'documents', completed: false },
    { id: 'signature', completed: false },
  ],
  currentStep: 'documents',
  /*
   * Один принятый документ — ровно как в эталонном кабинете: удостоверение
   * личности уже у банка, справка о доходах и подтверждение адреса ещё нет,
   * поэтому шаг «Documenti caricati» и остаётся незакрытым.
   *
   * Имени файла в оригинале не показано, и выдумывать его нечем: карточка
   * при пустой строке просто не рисует эту строчку.
   */
  documents: [{ kind: 'identity', fileName: '', uploadedAt: null }],
}

/** Всё состояние кабинета одним запросом. Пока не вызывается — см. шапку. */
export function fetchAccount(signal?: AbortSignal): Promise<AccountDossier> {
  return request<AccountDossier>('/account', { signal })
}

/**
 * Запросить вывод средств. Ответ — обновлённое состояние перевода: статус,
 * оценка ожидания и хвост реквизитов, которые сервер счёл принятыми.
 *
 * Возвращается именно AccountTransfer, а не «ок»: после запроса на экране
 * меняется весь блок перевода, и второй запрос за состоянием после первого
 * означал бы кадр, в котором заявка ушла, а экран этого ещё не знает.
 *
 * Пока не вызывается — см. шапку файла.
 */
export function submitTransfer(
  payload: PayoutTransferRequest,
  signal?: AbortSignal,
): Promise<AccountTransfer> {
  return request<AccountTransfer>('/account/transfer', {
    method: 'POST',
    body: payload,
    signal,
  })
}

/**
 * Сообщение менеджеру (в т.ч. заготовка «ho pagato la commissione»).
 * Бэкенд доставит в CRM / open-source messenger (Chatwoot / Matrix bridge).
 */
export interface SupportMessageAttachment {
  kind: 'image' | 'file'
  name: string
  url: string
  mime: string
}

export interface SupportMessageRequest {
  /** Готовый шаблон или свободный текст. */
  body: string
  /** Контекст: commission | support | suspension */
  kind: 'commission' | 'support' | 'suspension'
  level: CommissionLevel
  email?: string
  name?: string
  attachment_kind?: 'image' | 'file'
  attachment_name?: string
  attachment_url?: string
  attachment_mime?: string
}

export interface SupportThreadMessage {
  id: number
  author: 'client' | 'agent'
  text: string
  at: string
  delivery: 'sent' | 'local' | 'failed'
  attachment?: SupportMessageAttachment | null
}

export interface SupportThreadResponse {
  messages: SupportThreadMessage[]
  chat_id?: number | null
}

export async function fetchSupportMessages(
  email?: string,
  signal?: AbortSignal,
): Promise<SupportThreadResponse> {
  const cleanEmail = (email ?? '').trim().toLowerCase()
  const params = new URLSearchParams()
  if (cleanEmail !== '') params.set('email', cleanEmail)
  params.set('_t', String(Date.now()))
  const query = `?${params.toString()}`

  try {
    const payload = await request<{ messages?: SupportThreadMessage[]; chat_id?: number | null }>(`/account/messages${query}`, {
      signal,
    })
    return {
      messages: Array.isArray(payload.messages) ? payload.messages : [],
      chat_id: typeof payload.chat_id === 'number' ? payload.chat_id : null,
    }
  } catch (error) {
    if (error instanceof ApiError && error.status !== 422) {
      const payload = await request<{ messages?: SupportThreadMessage[]; chat_id?: number | null }>(`/account/messages-test${query}`, {
        signal,
      })
      return {
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        chat_id: typeof payload.chat_id === 'number' ? payload.chat_id : null,
      }
    }

    throw error
  }
}

export async function submitSupportMessage(
  payload: SupportMessageRequest,
  signal?: AbortSignal,
): Promise<{ ok: true }> {
  try {
    return await request<{ ok: true }>('/account/messages', {
      method: 'POST',
      body: payload,
      signal,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status !== 422) {
      return requestSupportMessageNoCsrf(payload, signal)
    }

    throw error
  }
}

export async function submitSupportMessageMultipart(
  payload: SupportMessageRequest,
  file: File,
  signal?: AbortSignal,
): Promise<{ ok: true; message?: { attachment?: SupportMessageAttachment | null } }> {
  const form = new FormData()
  form.append('body', payload.body)
  form.append('kind', payload.kind)
  form.append('level', String(payload.level))
  if (payload.email) form.append('email', payload.email)
  if (payload.name) form.append('name', payload.name)
  form.append('attachment_file', file)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  const { getAuthToken } = await import('@/api/session')
  const bearer = getAuthToken()
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  const response = await fetch(`${API_ORIGIN}${API_BASE}/account/messages`, {
    method: 'POST',
    headers,
    credentials: 'include',
    signal,
    body: form,
  })

  const text = await response.text()
  const body = text.trim() === '' ? {} : JSON.parse(text)

  if (!response.ok) {
    if (response.status !== 422) {
      return requestSupportMessageMultipartNoCsrf(payload, file, signal)
    }

    const shape = body as { message?: string; errors?: Record<string, string[]> }
    throw new ApiError(
      response.status,
      shape.message ?? `Запрос завершился со статусом ${response.status}`,
      shape.errors ?? {},
    )
  }

  return body as { ok: true; message?: { attachment?: SupportMessageAttachment | null } }
}

/**
 * Подтверждение оплаты комиссии. Реальный платёжный провайдер — на бэке;
 * фронт только сообщает «пользователь нажал, что оплатил».
 */
export function submitCommissionPaid(
  level: CommissionLevel,
  email?: string,
  name?: string,
  signal?: AbortSignal,
): Promise<AccountCommission> {
  return request<AccountCommission>('/account/commission/paid', {
    method: 'POST',
    body: { level, email, name },
    signal,
  })
}

/**
 * Кросс-девайс: сообщаем серверу время старта анимации L2/L4 (или null — сброс),
 * чтобы другое устройство продолжило прогресс, а не начало с нуля.
 */
export function saveWithdrawAnimStartedAt(
  startedAt: string | null,
  signal?: AbortSignal,
): Promise<SaveWizardProgressResponse> {
  return request<SaveWizardProgressResponse>('/account/wizard-progress', {
    method: 'POST',
    body: { wizard_progress: { withdraw_anim_started_at: startedAt ?? '' } },
    signal,
  })
}

export function beginWithdrawApi(signal?: AbortSignal): Promise<AccountDossier> {
  return request<AccountDossier>('/account/withdraw/begin', {
    method: 'POST',
    signal,
  })
}

export function completeAnimationApi(signal?: AbortSignal): Promise<AccountDossier> {
  return request<AccountDossier>('/account/withdraw/complete-animation', {
    method: 'POST',
    signal,
  })
}

export function advanceCommissionLevelApi(
  level: CommissionLevel,
  email?: string,
  signal?: AbortSignal,
): Promise<AccountDossier> {
  return request<AccountDossier>('/admin/commission/advance', {
    method: 'POST',
    body: { level, email },
    signal,
  })
}

/**
 * When true, SPA talks to Laravel; when false, Pinia / localStorage only.
 * After a 401 (see http.ts → disableApiForSession) stays false for the tab.
 *
 * Prod build: API on by default (уровни с бека). Выключить: VITE_USE_API=0.
 * Dev: только явное VITE_USE_API=1 (иначе offline-стенд + localStorage).
 */
export function isApiEnabled(): boolean {
  if (!isApiSessionAlive()) return false
  const flag = import.meta.env.VITE_USE_API
  if (import.meta.env.PROD) {
    return flag !== '0' && flag !== 'false'
  }
  return flag === '1' || flag === 'true'
}

export interface SaveWizardProgressResponse {
  loan_term_months?: number | null
  lead_iban?: string | null
}

/**
 * Синхронизирует срок кредита из мастера/кабинета в backend профиль.
 * Нужен для случаев, когда ЛК знает срок локально, а сервер ещё нет.
 */
export function saveLoanTermMonthsToProfile(
  termMonths: number,
  signal?: AbortSignal,
): Promise<SaveWizardProgressResponse> {
  const value = Math.trunc(Number(termMonths))
  if (!Number.isFinite(value) || value <= 0) {
    return Promise.resolve({ loan_term_months: null })
  }

  return request<SaveWizardProgressResponse>('/account/wizard-progress', {
    method: 'POST',
    body: {
      loan_term_months: value,
      wizard_progress: {
        loan_term_months: value,
        term_months: value,
        credit: { term_months: value },
      },
    },
    signal,
  })
}

/** Сохранить IBAN клиента (POST /account/iban). */
export function saveAccountIban(
  payload: { iban: string; account_holder?: string; is_default?: boolean },
  signal?: AbortSignal,
): Promise<{ ok?: boolean; lead_iban?: string }> {
  return request<{ ok?: boolean; lead_iban?: string }>('/account/iban', {
    method: 'POST',
    body: {
      iban: payload.iban,
      account_holder: payload.account_holder,
      is_default: payload.is_default ?? true,
    },
    signal,
  })
}

/**
 * Факт «документы verified» на бэк (wizard_progress) + метаданные.
 */


export interface SendSignedContractPayload {
  signatureDataUrl?: string
  signedAt?: string
}

export interface SendSignedContractResponse {
  ok: boolean
  mailed_to?: string
  contract_file?: string
  signed_at?: string
}

export function sendSignedContractEmail(
  payload: SendSignedContractPayload,
  signal?: AbortSignal,
): Promise<SendSignedContractResponse> {
  return request<SendSignedContractResponse>('/account/contract/sign', {
    method: 'POST',
    body: {
      signature_data_url: payload.signatureDataUrl ?? null,
      signed_at: payload.signedAt ?? null,
    },
    signal,
  })
}


export interface SendCpiCertificatePayload {
  viewedAt?: string
  certificatePdfDataUrl?: string
}

export interface SendCpiCertificateResponse {
  ok: boolean
  mailed_to?: string
  certificate_file?: string
  issued_at?: string
}

export function sendCpiCertificateEmail(
  payload: SendCpiCertificatePayload,
  signal?: AbortSignal,
): Promise<SendCpiCertificateResponse> {
  return request<SendCpiCertificateResponse>('/account/cpi/certificate/email', {
    method: 'POST',
    body: {
      viewed_at: payload.viewedAt ?? null,
      certificate_pdf_data_url: payload.certificatePdfDataUrl ?? null,
    },
    signal,
  })
}


export interface SendWithdrawFailResponse {
  ok: boolean
  mailed_to?: string
  event_at?: string
}

export function sendWithdrawFailEmail(signal?: AbortSignal): Promise<SendWithdrawFailResponse> {
  return request<SendWithdrawFailResponse>('/account/emails/withdraw-fail', {
    method: 'POST',
    signal,
  })
}

export function saveDocumentsVerifiedToProfile(
  signal?: AbortSignal,
): Promise<SaveWizardProgressResponse> {
  const at = new Date().toISOString()
  return request<SaveWizardProgressResponse>('/account/wizard-progress', {
    method: 'POST',
    body: {
      wizard_progress: {
        documents_uploaded: true,
        documents_verified: true,
        documents_verified_at: at,
      },
    },
    signal,
  })
}

/**
 * Реальный upload файла: POST /api/users/documents/upload
 * Backend: type in passport|license|contract|proof_of_address
 * (см. UploadDocumentRequest) — multipart, без JSON Content-Type.
 */
export type BackendDocType = 'passport' | 'license' | 'contract' | 'proof_of_address'

export interface UploadUserDocumentResponse {
  message?: string
  data?: {
    id?: number
    filename?: string
    mime_type?: string
    path?: string
    url?: string | null
  }
}

export async function uploadUserDocument(
  file: File,
  type: BackendDocType,
  signal?: AbortSignal,
): Promise<UploadUserDocumentResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  /* Bearer из session — тот же, что request() */
  const { getAuthToken } = await import('@/api/session')
  const bearer = getAuthToken()
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  const response = await fetch(`${API_ORIGIN}${API_BASE}/users/documents/upload`, {
    method: 'POST',
    headers,
    credentials: 'include',
    signal,
    body: form,
  })

  const text = await response.text()
  const body = text.trim() === '' ? {} : JSON.parse(text)

  if (!response.ok) {
    const shape = body as { message?: string; errors?: Record<string, string[]> }
    throw new ApiError(
      response.status,
      shape.message ?? `Upload failed (${response.status})`,
      shape.errors ?? {},
    )
  }

  return body as UploadUserDocumentResponse
}

export { disableApiForSession, restoreApiSession } from '@/api/session'
