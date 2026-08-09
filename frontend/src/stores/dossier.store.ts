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
   * Фазы, которыми владеет клиентский UX (таймер L2/L4, waiting после
   * сообщения, messenger после оплаты). GET /account с main часто отдаёт
   * phase=ready — без merge анимация/ожидание сбрасывались через несколько
   * секунд (sync) и «возвращали» на старт этапа.
   */
  const CLIENT_FUNNEL_PHASES = new Set<CommissionPhase>([
    'waiting',
    'animating',
    'messenger',
    'pay_fee',
    'suspended',
    'tg_final',
    'failed',
    /* L3 после CPI: ready локально, GET /account часто снова policy_build. */
    'ready',
  ])

  /**
   * Единственная точка входа для настоящего ответа: сюда придёт результат
   * fetchAccount(). Больше в сторе менять будет нечего.
   */
  function hydrate(next: AccountDossier): void {
    const prev = dossier.value
    const copy = structuredClone(next)
    const rawLevel = copy.commission.level as number
    if (rawLevel === 5) {
      copy.commission.level = 4
      copy.commission.phase = 'tg_final'
    } else {
      copy.commission.level = normalizeCommissionLevel(rawLevel)
    }

    const prevLevel = normalizeCommissionLevel(prev.commission.level)
    const nextLevel = normalizeCommissionLevel(copy.commission.level)

    /*
     * Админ поднял level — берём сервер целиком.
     * Тот же level + локальная воронка — сохраняем phase/timer (canvas/таймер).
     */
    if (nextLevel === prevLevel && CLIENT_FUNNEL_PHASES.has(prev.commission.phase)) {
      copy.commission.phase = prev.commission.phase
      copy.commission.animationStartedAt = prev.commission.animationStartedAt
      copy.commission.animationMs = prev.commission.animationMs
      if (
        prev.commission.phase === 'policy_build' ||
        prev.commission.policyProgress > copy.commission.policyProgress
      ) {
        copy.commission.policyProgress = prev.commission.policyProgress
      }
      /* transfer.status authorizing during animating */
      if (
        prev.commission.phase === 'animating' ||
        prev.commission.phase === 'suspended' ||
        prev.commission.phase === 'tg_final'
      ) {
        copy.transfer = { ...copy.transfer, ...prev.transfer }
      }
    }

    dossier.value = copy

    /*
     * lead_iban с GET /account → local account.store (иначе после F5 IBAN «пропал»).
     * silent: не POST обратно.
     */
    try {
      const leadIban =
        (typeof (copy as { lead_iban?: string | null }).lead_iban === 'string'
          ? (copy as { lead_iban?: string }).lead_iban
          : null) ||
        (typeof (copy.client as { lead_iban?: string | null } | undefined)?.lead_iban ===
        'string'
          ? (copy.client as { lead_iban?: string }).lead_iban
          : null)

      if (leadIban && leadIban.replace(/\s/g, '').length >= 10) {
        const account = useAccountStore()
        if (!account.ibanFull || account.ibanFull.replace(/\s/g, '').length < 10) {
          account.setIbanFromRaw(leadIban, { silent: true })
        }
      }
    } catch {
      /* store optional during early boot */
    }
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
    dossier.value.commission.content = structuredClone(full.commission.content ?? {})
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

    /*
     * ready / suspended — обычный старт.
     * waiting — после 1° сообщения: Preleva снова → pay_fee (механизм комиссии).
     */
    if (phase !== 'ready' && phase !== 'suspended' && phase !== 'waiting') return false

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
   *
   * Не шлём второй текст в чат: клиент уже отправил итальянский шаблон
   * (kind=commission) через useSupportChat.send. Старый EN
   * «Commission receipt confirmed» попадал в ленту (фотка 3).
   */
  function markMessageSent(): void {
    dossier.value.commission.phase = 'waiting'
    /*
     * L2: после fail-анимации transfer мог остаться authorizing —
     * сбрасываем, чтобы Home не «залипал» на отказе (статус/сцена).
     */
    if (normalizeCommissionLevel(dossier.value.commission.level) === 2) {
      dossier.value.transfer.status = 'idle'
      dossier.value.transfer.method = null
      dossier.value.transfer.accountTail = ''
    }
    /* Никакого EN «Commission receipt confirmed» — только phase. */
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
      const fromDossier = dossier.value.client.email?.trim().toLowerCase() || ''
      const fromSimulator = (localStorage.getItem('velora:email') || '').trim().toLowerCase()
      const email =
        fromDossier !== '' && !fromDossier.endsWith('@esempio.it')
          ? fromDossier
          : fromSimulator || undefined

      void advanceCommissionLevelApi(level, email)
        .then((full) => {
          hydrate(full)
          const lv = normalizeCommissionLevel(full.commission.level)
          account.recordPaidCommissionsUpTo(lv)
          /* L2: Preleva снова активна (не sticky lock после L1/fail). */
          if (lv === 2) {
            account.clearL2PrelevaLock()
            if (dossier.value.commission.phase === 'waiting') {
              dossier.value.commission.phase = 'ready'
            }
          }
          if (lv >= 3) account.clearL2PrelevaLock()
        })
        .catch(() => {
          /*
           * Прод/демо safety-net: даже если API временно не нашёл пользователя
           * (например, stub email или просевшая сессия), переключатель уровней
           * должен работать визуально.
           */
          account.recordPaidCommissionsUpTo(level)
          advanceCommissionLevelOffline(dossier.value, level)
          if (level === 2) account.clearL2PrelevaLock()
          if (level >= 3) account.clearL2PrelevaLock()
        })
      return
    }

    /* Offline стенд: предыдущие этапы оплачены → Prestito. */
    account.recordPaidCommissionsUpTo(level)
    advanceCommissionLevelOffline(dossier.value, level)
    if (level === 2 || level >= 3) account.clearL2PrelevaLock()
  }

  /**
   * L2 после таймера 7 мин: suspended → «Paga la copertura» → pay_fee.
   * После оплаты markFeePaid → messenger (заготовки) → waiting → админ L3.
   */
  function openFeeFromSuspension(): void {
    if (dossier.value.commission.phase !== 'suspended') return
    const level = normalizeCommissionLevel(dossier.value.commission.level)
    dossier.value.commission.level = level
    const currentCents = Number(dossier.value.commission.fee?.amountCents ?? 0)
    if (!Number.isFinite(currentCents) || currentCents <= 0) {
      dossier.value.commission.fee = COMMISSION_FEE_BY_LEVEL[level] ?? dossier.value.commission.fee
    }
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
