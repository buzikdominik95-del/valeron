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
    return parsed
  } catch {
    return null
  }
}

export const useDossierStore = defineStore('dossier', () => {
  /**
   * Offline: восстанавливаем сессию (level/phase/anim) после refresh.
   * API-режим: при pullAccount hydrate перезапишет.
   */
  const stored = !isApiEnabled() ? readStoredDossier() : null
  const dossier = ref<AccountDossier>(
    stored ? structuredClone(stored) : structuredClone(ACCOUNT_DOSSIER_STUB),
  )

  /* Persist offline session (commission funnel survives reload). */
  if (!isApiEnabled()) {
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
  }

  /**
   * Единственная точка входа для настоящего ответа: сюда придёт результат
   * fetchAccount(). Больше в сторе менять будет нечего.
   */
  function hydrate(next: AccountDossier): void {
    dossier.value = next
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

  async function pullAccount(): Promise<void> {
    if (!isApiEnabled()) return
    const full = await fetchAccount()
    hydrate(full)
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
   * Пользователь нажал «Preleva» при canWithdraw. Что именно случится дальше
   * без бэкенда — см. beginWithdrawOffline.
   */
  function beginWithdrawFlow(): boolean {
    const phase = dossier.value.commission.phase
    if (phase !== 'ready' && phase !== 'suspended') return false

    if (isApiEnabled()) {
      void beginWithdrawApi()
        .then(hydrate)
        .catch(() => undefined)
      return true
    }

    beginWithdrawOffline(dossier.value)
    return true
  }

  /** Оплата комиссии подтверждена. */
  function markFeePaid(): void {
    const level = dossier.value.commission.level
    /* Трата в Prestito + точка на кнопке, пока не открыли детали. */
    useAccountStore().recordPaidCommission(level)

    if (isApiEnabled()) {
      void submitCommissionPaid(level)
        .then((commission) => {
          dossier.value.commission = commission
          if (level === 3 && commission.phase === 'messenger') {
            dossier.value.policy.status = 'issued'
            dossier.value.policy.etaMinutes = 0
          }
        })
        .catch(() => undefined)
      return
    }

    markFeePaidOffline(dossier.value)
  }

  /** Сообщение менеджеру отправлено → waiting; L4 — сразу финал TG. */
  function markMessageSent(): void {
    const level = dossier.value.commission.level
    if (isApiEnabled()) {
      void submitSupportMessage({
        body: 'Commission receipt confirmed',
        kind: 'commission',
        level,
      })
        .then(() => pullAccount())
        .catch(() => {
          dossier.value.commission.phase = level === 4 ? 'tg_final' : 'waiting'
        })
      return
    }
    /* L4: после отписки менеджеру — конечный экран с Telegram. */
    dossier.value.commission.phase = level === 4 || level === 5 ? 'tg_final' : 'waiting'
  }

  /**
   * Анимация перевода дошла до конца — узнаём исход.
   *
   * ИСХОД ПЕРЕВОДА РЕШАЕТ СЕРВЕР, А НЕ ФРОНТ. Успех, приостановка и отказ —
   * это ответ платёжной стороны, и с подключённым бэкендом здесь ровно один
   * путь: спросить и показать то, что пришло (completeAnimationApi → hydrate).
   */
  function completeAnimation(): void {
    if (isApiEnabled()) {
      void completeAnimationApi()
        .then(hydrate)
        .catch(() => undefined)
      return
    }

    applyOfflineOutcome(dossier.value)
  }

  /**
   * Флаг админа / DEV-бар: перевести клиента на уровень N.
   *
   * СНАЧАЛА локально (чтобы кнопки L1–L4 работали даже при живом API, если
   * admin endpoint ещё не готов или отвечает ошибкой). Если API включён —
   * параллельно шлём на сервер; успех подтянет hydrate, сбой оставляет
   * локальное состояние.
   */
  function advanceCommissionLevel(level: CommissionLevel): void {
    /* Admin/demo: предыдущие этапы считаются оплаченными → строки в Prestito. */
    useAccountStore().recordPaidCommissionsUpTo(level)
    advanceCommissionLevelOffline(dossier.value, level)

    if (!isApiEnabled()) return

    void advanceCommissionLevelApi(level)
      .then(hydrate)
      .catch(() => undefined)
  }

  /** С suspended / после деталей — снова pay_fee (страховка / повтор). */
  function openFeeFromSuspension(): void {
    if (dossier.value.commission.phase !== 'suspended') return
    dossier.value.commission.phase = 'pay_fee'
  }

  /** L4 failed → pay_fee 280 € (тот же drawer, что на других этапах). */
  function openFeeFromFailure(): void {
    if (isApiEnabled()) {
      /* Offline-first UX; API hydrate пришлёт phase, если есть. */
      openFeeFromFailureOffline(dossier.value)
      return
    }
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
