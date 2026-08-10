import {
  COMMISSION_ANIMATION_MS,
  COMMISSION_FEE_BY_LEVEL,
  defaultCommission,
  normalizeCommissionLevel,
} from '@/api/commission'
import type { AccountDossier, PayoutTransferRequest } from '@/api/account.api'
import type { CommissionLevel } from '@/api/commission'

/**
 * ЗАГЛУШКИ НА ВРЕМЯ БЕЗ БЭКЕНДА — не продуктовые правила.
 *
 * Пока сервера нет, отвечать на «что стало с переводом» некому, а экраны
 * исходов нужно чем-то открывать при разработке. Роль сервера играет
 * переключатель уровней (VelDevCommissionBar): выбранный уровень задаёт,
 * какой исход показать.
 *
 * ЧТОБЫ НЕ БЫЛО ПУТАНИЦЫ: связка «уровень → исход» существует ТОЛЬКО здесь и
 * только когда isApiEnabled() ложно. Продукт так не работает и работать не
 * должен — настоящий отказ банка не зависит от тарифа. Когда появится
 * бэкенд, этот модуль удаляется целиком, а не переносится куда-то ещё:
 * в dossier.store останутся ровно вызовы API и hydrate().
 *
 * ПОЧЕМУ ФУНКЦИИ, А НЕ КУСКИ СТОРА. Отдельным файлом граница видна глазом:
 * всё, что здесь, — временное. Дело клиента приходит сюда тем же реактивным
 * объектом, что лежит в сторе, поэтому записи в его поля доходят до экрана
 * так же, как если бы стояли в самом сторе.
 */

/** Сколько знаков реквизитов остаётся видно в деталях перевода. */
const ACCOUNT_TAIL_LENGTH = 4


function resolveFeeForLevel(dossier: AccountDossier, level: CommissionLevel) {
  const fallback = COMMISSION_FEE_BY_LEVEL[level]
  const current = dossier.commission.fee
  const cents = Number(current?.amountCents ?? 0)

  if (Number.isFinite(cents) && cents > 0) {
    return {
      amountCents: Math.round(cents),
      reason: current?.reason ?? fallback.reason,
    }
  }

  return fallback
}

/**
 * Заявка на перевод принята «банком».
 *
 * ПОЛНЫЕ РЕКВИЗИТЫ ЗДЕСЬ НЕ ОСЕДАЮТ. В деле остаётся только хвост: экрану
 * больше и не нужно, а лишняя копия номера карты в памяти вкладки это ровно
 * то, чего быть не должно.
 */
export function startTransferOffline(
  dossier: AccountDossier,
  request: PayoutTransferRequest,
): void {
  dossier.transfer.method = request.method
  dossier.transfer.accountTail = request.account.slice(-ACCOUNT_TAIL_LENGTH)
  dossier.transfer.status = 'authorizing'
}

/**
 * Нажали «Preleva» при canWithdraw.
 * L1 / L3 (без длинной анимации сразу) → pay_fee.
 * L2 / L4 → animating (таймер + canvas), исход после окончания.
 */
export function beginWithdrawOffline(dossier: AccountDossier): void {
  /* Number(): после JSON/localStorage level иногда приходит строкой — иначе
   * `level === 2` ложно и L2 уходит в pay_fee вместо animating. */
  const level = normalizeCommissionLevel(dossier.commission.level)
  dossier.commission.level = level

  if (level === 2 || level === 4 || level === 5) {
    dossier.commission.phase = 'animating'
    /* Всегда табличное значение — битый animationMs:0 из storage залипал на 0%. */
    dossier.commission.animationMs =
      COMMISSION_ANIMATION_MS[level] > 0 ? COMMISSION_ANIMATION_MS[level] : level === 2 ? 7 * 60_000 : 3 * 60_000
    dossier.commission.animationStartedAt = new Date().toISOString()
    dossier.transfer.status = 'authorizing'
    dossier.transfer.method = dossier.transfer.method ?? 'iban'
    dossier.transfer.etaMinutes = dossier.transfer.etaMinutes || 60
    return
  }

  dossier.commission.phase = 'pay_fee'
  dossier.commission.fee = resolveFeeForLevel(dossier, level)
}

/** Оплата комиссии подтверждена. */
export function markFeePaidOffline(dossier: AccountDossier): void {
  const level = normalizeCommissionLevel(dossier.commission.level)
  dossier.commission.level = level
  /* В API-режиме не затираем серверную сумму локальной константой. */
  dossier.commission.fee = resolveFeeForLevel(dossier, level)

  /*
   * L3: после CPI пользователь платит 136 € как на L1 → messenger.
   */
  if (level === 3) {
    dossier.commission.policyProgress = 1
    dossier.policy.status = 'issued'
    dossier.policy.etaMinutes = 0
    dossier.commission.phase = 'messenger'
    return
  }

  /* L1 / L2: чат с менеджером. L4 fee снят — финал через анимацию → tg_final. */
  dossier.commission.phase = 'messenger'
}

/**
 * @deprecated L4 больше не открывает оплату 280 € — сразу tg_final.
 * Оставлено no-op, чтобы не ломать старые вызовы.
 */
export function openFeeFromFailureOffline(dossier: AccountDossier): void {
  if (dossier.commission.level !== 4) return
  /* Финал Telegram вместо fee 280 € */
  dossier.transfer.status = 'failed'
  dossier.commission.phase = 'tg_final'
  dossier.commission.fee = COMMISSION_FEE_BY_LEVEL[4]
}

/**
 * Анимация дошла до конца → автоматический «отказ» по уровню (без API):
 *  L2 → suspended (заморозка + оплата покрытия)
 *  L4 → tg_final (Telegram)
 */
export function applyOfflineOutcome(dossier: AccountDossier): void {
  const level = normalizeCommissionLevel(dossier.commission.level)
  dossier.commission.level = level
  dossier.commission.animationStartedAt = null
  /*
   * Метку withdraw_anim_started_at на сервере НЕ стираем: по истёкшей метке
   * бэкенд сам фиксирует итог (suspended/tg_final) в wizard_progress —
   * это гарантирует сохранение прогресса после logout/login.
   */

  if (level === 2) {
    dossier.transfer.status = 'suspended'
    dossier.commission.phase = 'suspended'
    dossier.commission.fee = resolveFeeForLevel(dossier, 2)
    return
  }

  if (level === 4 || level === 5) {
    /* L5: phase tg_final для персистентности, но все red-визуалы скрыты по level===5. */
    dossier.transfer.status = 'failed'
    dossier.commission.phase = 'tg_final'
    dossier.commission.fee = COMMISSION_FEE_BY_LEVEL[level]
  }
}

/** Флаг админа: перевести клиента на уровень N (1…4). */
export function advanceCommissionLevelOffline(
  dossier: AccountDossier,
  level: CommissionLevel,
): void {
  const lv = normalizeCommissionLevel(level)
  dossier.commission = defaultCommission(lv)

  if (lv === 3) {
    dossier.policy.status = 'processing'
    dossier.policy.etaMinutes = 15
  }

  /*
   * L4: CPI уже пройден на L3 — сертификат остаётся issued.
   */
  if (lv >= 4) {
    dossier.policy.status = 'issued'
    dossier.policy.etaMinutes = 0
    dossier.commission.policyProgress = 1
  }

  dossier.transfer.status = 'idle'
  dossier.transfer.method = null
  dossier.transfer.accountTail = ''
}
