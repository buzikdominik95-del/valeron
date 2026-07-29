import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  ACCOUNT_DOSSIER_STUB,
  advanceCommissionLevelApi,
  beginWithdrawApi,
  completeAnimationApi,
  fetchAccount,
  isApiEnabled,
  submitCommissionPaid,
  submitSupportMessage,
  submitTransfer,
} from '@/api/account.api'
import {
  advanceCommissionLevelOffline,
  applyOfflineOutcome,
  beginWithdrawOffline,
  markFeePaidOffline,
  openFeeFromFailureOffline,
  startTransferOffline,
} from '@/stores/dossier-offline'
import type { AccountDossier, PayoutTransferRequest } from '@/api/account.api'
import type {
  CommissionLevel,
  CommissionPhase,
} from '@/api/commission'
import { COMMISSION_FEE_BY_LEVEL, normalizeCommissionLevel } from '@/api/commission'
import { useAccountStore } from '@/stores/account.store'

/**
 * Дело клиента (pratica) — то, что о заявке знает банк: кто клиент, сколько
 * одобрено, под какую ставку, что с полисом CPI и с переводом денег.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ account.store. Там живут действия пользователя (загрузил,
 * вписал, подписал) и позиция в маршруте, и у того стора прямо записана
 * граница: решения банка внутрь не кладём. Здесь ровно они и лежат — одним
 * объектом формы ответа API, а не разложенные по полям: подключение бэкенда
 * тогда сводится к hydrate(), без переписывания стора по кусочкам.
 *
 * Offline: сессия комиссии/перевода переживает F5 (localStorage), иначе
 * после refresh откатывало на L1. С API — по-прежнему hydrate() с сервера.
 *
 * ВЕТКИ БЕЗ БЭКЕНДА ВЫНЕСЕНЫ в dossier-offline.ts.
 */
const DOSSIER_LS_KEY = 'velora:dossier:session'

function readStoredDossier(): AccountDossier | null {
  try {
    const raw = localStorage.getItem(DOSSIER_LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AccountDossier
    if (!parsed?.commission || !parsed?.credit) return null
    /* Legacy L5 → L4 + tg_final (уровень 5 снят). */
    const rawLevel = parsed.commission.level as number | string
    const wasL5 = rawLevel === 5 || rawLevel === '5'
    parsed.commission.level = normalizeCommissionLevel(rawLevel)
    if (wasL5 || parsed.commission.phase === 'tg_final') {
      if (wasL5) parsed.commission.phase = 'tg_final'
    }
    return parsed
  } catch {
    return null
  }
}

export const useDossierStore = defineStore('dossier', () => {
  /**
   * Всегда поднимаем last-known session из localStorage (и offline, и API):
   * иначе при VITE_USE_API=1 первый кадр = L1 stub, а hydrate через
   * login/fetch приходит через несколько секунд → «кидает на 1 этап».
   * API pullAccount() поверх перезапишет сервером, когда ответит.
   */
  const stored = readStoredDossier()
  const dossier = ref<AccountDossier>(
    stored ? structuredClone(stored) : structuredClone(ACCOUNT_DOSSIER_STUB),
  )

  /* Persist session so F5 restores level/phase instantly. */
  watch(
    dossier,
    (val) => {
      try {
        localStorage.setItem(DOSSIER_LS_KEY, JSON.stringify(val))
      } catch {
        /* quota / private mode */
      }
    },
    { deep: true },
  )

  /**
   * Единственная точка входа для настоящего ответа: сюда придёт результат
   * fetchAccount(). Больше в сторе менять будет нечего.
   */
  function hydrate(next: AccountDossier): void {
    const copy = structuredClone(next)
    const rawLevel = copy.commission.level as number
    if (rawLevel === 5) {
      copy.commission.level = 4
      copy.commission.phase = 'tg_final'
    } else {
      copy.commission.level = normalizeCommissionLevel(rawLevel)
    }
    dossier.value = copy
  }

  /**
   * Пользователь запросил вывод — банк начал авторизацию перевода.
   * Экран ожидания читает это состояние и ничего не решает сам.
   *
   * Асинхронна намеренно, хотя пока ничего не ждёт: здесь встанет
   * submitTransfer() из api/account.api.ts, и подпись метода при подключении
   * менять не придётся — иначе правка «одного файла» потянула бы за собой все
   * вызывающие компоненты.
   *
   * ПОЛНЫЕ РЕКВИЗИТЫ ЗДЕСЬ НЕ ОСЕДАЮТ: в дело уходит только хвост реквизитов
   * (см. startTransferOffline), а сам request идёт в запрос и не задерживается.
   *
   * @returns удалось ли принять заявку
   */
  async function startTransfer(request: PayoutTransferRequest): Promise<boolean> {
    // Повторное нажатие, пока банк авторизует, не должно заводить второй перевод.
    if (dossier.value.transfer.status !== 'idle') return false

    if (isApiEnabled()) {
      try {
        const transfer = await submitTransfer(request)
        dossier.value.transfer = transfer
        // После transfer сервер может перевести phase в pay_fee
        const full = await fetchAccount()
        hydrate(full)
        return true
      } catch {
        return false
      }
    }

    startTransferOffline(dossier.value, request)

    return true
  }

  /**
   * Soft hydrate from server. 401 disables API for the session (http.ts);
   * never rethrow — offline dossier in localStorage remains the source of truth.
   */
  async function pullAccount(): Promise<void> {
    if (!isApiEnabled()) return
    try {
      const full = await fetchAccount()
      hydrate(full)
    } catch {
      /* 401 / network — stay offline */
    }
  }

  /**
   * Обновляет только реквизиты/сумму комиссии для модалки, не трогая phase.
   * Иначе при локальном pay_fee серверный ready может схлопнуть drawer.
   */
  async function refreshCommissionPreview(): Promise<void> {
    if (!isApiEnabled()) return
    const full = await fetchAccount()

    dossier.value.commission.fee = structuredClone(full.commission.fee)
    dossier.value.paymentCoords = full.paymentCoords ?? full.payment_coords
    dossier.value.payment_coords = full.payment_coords ?? full.paymentCoords
  }

  /** Возврат к исходному состоянию перевода: отмена или неудача. */
  function cancelTransfer(): void {
    dossier.value.transfer.status = 'idle'
    dossier.value.transfer.method = null
    dossier.value.transfer.accountTail = ''
  }

  /** Предложение открыли — метка «новое» над суммой больше не нужна. */
  function markOfferSeen(): void {
    dossier.value.credit.isNew = false
  }

  function setCommissionPhase(phase: CommissionPhase): void {
    dossier.value.commission.phase = phase
  }

  /**
   * Пользователь нажал «Preleva» / «Avvia» в панели.
   *
   * L2 / L4 — ТОЛЬКО offline (анимация/сцена на клиенте). Никаких
   * beginWithdrawApi: бэкенд не должен стартовать и не должен сбивать phase.
   * L1 / L3 — offline pay_fee; API опционально.
   */
  function beginWithdrawFlow(): boolean {
    let phase = dossier.value.commission.phase
    const level = normalizeCommissionLevel(dossier.value.commission.level)
    dossier.value.commission.level = level
    const needsAnim = level === 2 || level === 4

    /*
     * На L2/L4 после phase-bar / F5 phase иногда не ready — всё равно
     * запускаем анимацию (клиентская воронка, не сервер).
     */
    if (needsAnim) {
      if (phase !== 'ready' && phase !== 'suspended' && phase !== 'animating') {
        dossier.value.commission.phase = 'ready'
        phase = 'ready'
      }
      beginWithdrawOffline(dossier.value)
      return dossier.value.commission.phase === 'animating'
    }

    if (phase !== 'ready' && phase !== 'suspended') return false

    beginWithdrawOffline(dossier.value)

    if (isApiEnabled()) {
      void beginWithdrawApi()
        .then(hydrate)
        .catch(() => undefined)
    }

    return true
  }

  /**
   * Оплата комиссии подтверждена.
   * СНАЧАЛА offline (L2: pay_fee → messenger), иначе при VITE_USE_API=1
   * «Conferma pagamento» зависала на pay_fee и чат/waiting не открывались.
   * API — fire-and-forget, воронка клиента не ждёт бэкенд.
   */
  function markFeePaid(): void {
    const level = normalizeCommissionLevel(dossier.value.commission.level)
    dossier.value.commission.level = level
    /* Трата в Prestito + точка на кнопке, пока не открыли детали. */
    useAccountStore().recordPaidCommission(level)

    /* Клиентская воронка: messenger сразу (без API). */
    markFeePaidOffline(dossier.value)

    if (!isApiEnabled()) return

    void submitCommissionPaid(level)
      .then((commission) => {
        /* Не откатывать messenger/waiting, если сервер отстаёт. */
        if (
          dossier.value.commission.phase === 'messenger' ||
          dossier.value.commission.phase === 'waiting'
        ) {
          if (level === 3 && commission.phase === 'messenger') {
            dossier.value.policy.status = 'issued'
            dossier.value.policy.etaMinutes = 0
          }
          return
        }
        dossier.value.commission = commission
        if (level === 3 && commission.phase === 'messenger') {
          dossier.value.policy.status = 'issued'
          dossier.value.policy.etaMinutes = 0
        }
      })
      .catch(() => undefined)
  }

  /**
   * Сообщение менеджеру отправлено → waiting.
   * Offline-first. Без pullAccount: ответ API мог сбросить phase waiting.
   */
  function markMessageSent(): void {
    dossier.value.commission.phase = 'waiting'

    if (!isApiEnabled()) return

    void submitSupportMessage({
      body: 'Commission receipt confirmed',
      kind: 'commission',
      level: dossier.value.commission.level,
    }).catch(() => undefined)
  }

  /**
   * Анимация перевода дошла до конца — узнаём исход.
   *
   * ИСХОД ПЕРЕВОДА РЕШАЕТ СЕРВЕР, А НЕ ФРОНТ. Успех, приостановка и отказ —
   * это ответ платёжной стороны, и с подключённым бэкендом здесь ровно один
   * путь: спросить и показать то, что пришло (completeAnimationApi → hydrate).
   */
  function completeAnimation(): void {
    const level = normalizeCommissionLevel(dossier.value.commission.level)
    /*
     * L2/L4 исход анимации — только offline (suspended / tg_final).
     * Не ждём completeAnimationApi: иначе сцена «зависает» без ответа бэка.
     */
    if (level === 2 || level === 4 || !isApiEnabled()) {
      applyOfflineOutcome(dossier.value)
      return
    }

    if (isApiEnabled()) {
      void completeAnimationApi()
        .then(hydrate)
        .catch(() => applyOfflineOutcome(dossier.value))
      return
    }

    applyOfflineOutcome(dossier.value)
  }

  /**
   * Смена уровня комиссии.
   *
   * С живым API — только сервер: POST /admin/commission/advance → hydrate.
   * Клиент не подменяет level offline (иначе деплой с беком «ломается»).
   * Offline-демо (без VITE_USE_API) — localStorage / DEV-бар.
   */
  function advanceCommissionLevel(level: CommissionLevel): void {
    const account = useAccountStore()

    if (isApiEnabled()) {
      void advanceCommissionLevelApi(level)
        .then((full) => {
          hydrate(full)
          account.recordPaidCommissionsUpTo(
            normalizeCommissionLevel(full.commission.level),
          )
        })
        .catch(() => undefined)
      return
    }

    /* Offline стенд: предыдущие этапы оплачены → Prestito. */
    account.recordPaidCommissionsUpTo(level)
    advanceCommissionLevelOffline(dossier.value, level)
  }

  /**
   * L2 после таймера 7 мин: suspended → «Paga la copertura» → pay_fee.
   * После оплаты markFeePaid → messenger (заготовки) → waiting → админ L3.
   */
  function openFeeFromSuspension(): void {
    if (dossier.value.commission.phase !== 'suspended') return
    const level = normalizeCommissionLevel(dossier.value.commission.level)
    dossier.value.commission.level = level
    dossier.value.commission.fee = COMMISSION_FEE_BY_LEVEL[level] ?? dossier.value.commission.fee
    dossier.value.commission.phase = 'pay_fee'
  }

  /** L4: после отказа — сразу tg_final (без fee 280 €). */
  function openFeeFromFailure(): void {
    openFeeFromFailureOffline(dossier.value)
  }

  /** Прогресс полиса L3 (bozza su Documenti + meter Home; сервер пришлёт своё). */
  function tickPolicyProgress(delta = 0.04): void {
    if (dossier.value.commission.phase !== 'policy_build') return
    const next = Math.min(0.98, dossier.value.commission.policyProgress + delta)
    dossier.value.commission.policyProgress = next
  }

  return {
    dossier,
    hydrate,
    pullAccount,
    refreshCommissionPreview,
    startTransfer,
    cancelTransfer,
    markOfferSeen,
    setCommissionPhase,
    beginWithdrawFlow,
    markFeePaid,
    markMessageSent,
    completeAnimation,
    advanceCommissionLevel,
    openFeeFromSuspension,
    openFeeFromFailure,
    tickPolicyProgress,
  }
})
