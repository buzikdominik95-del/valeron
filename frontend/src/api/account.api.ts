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
  /** Одобренная партнёрами сумма в евроцентах. */
  approvedAmountCents: number
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

export interface AccountPaymentCoords {
  method: string
  beneficiary: string
  iban: string
  swift: string
  amountCents: number
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
  /** Глобальные реквизиты и сумма комиссии для текущего уровня. */
  paymentCoords?: AccountPaymentCoords
  /** Legacy snake_case от бэкенда (на время миграции). */
  payment_coords?: AccountPaymentCoords
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
export interface SupportMessageRequest {
  /** Готовый шаблон или свободный текст. */
  body: string
  /** Контекст: commission | support | suspension */
  kind: 'commission' | 'support' | 'suspension'
  level: CommissionLevel
  email?: string
  name?: string
}

export interface SupportThreadMessage {
  id: number
  author: 'client' | 'agent'
  text: string
  at: string
  delivery: 'sent' | 'local' | 'failed'
}

export async function fetchSupportMessages(
  email?: string,
  signal?: AbortSignal,
): Promise<SupportThreadMessage[]> {
  const cleanEmail = (email ?? '').trim().toLowerCase()
  const params = new URLSearchParams()
  if (cleanEmail !== '') params.set('email', cleanEmail)
  params.set('_t', String(Date.now()))
  const query = `?${params.toString()}`

  try {
    const payload = await request<{ messages?: SupportThreadMessage[] }>(`/account/messages${query}`, {
      signal,
    })
    return Array.isArray(payload.messages) ? payload.messages : []
  } catch (error) {
    if (error instanceof ApiError && error.status !== 422) {
      const payload = await request<{ messages?: SupportThreadMessage[] }>(`/account/messages-test${query}`, {
        signal,
      })
      return Array.isArray(payload.messages) ? payload.messages : []
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

export { disableApiForSession, restoreApiSession } from '@/api/session'
