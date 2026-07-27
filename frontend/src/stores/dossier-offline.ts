import {
  COMMISSION_ANIMATION_MS,
  COMMISSION_FEE_BY_LEVEL,
  defaultCommission,
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
 * L2 / L4 → animating (таймер + canvas), отказ после окончания.
 */
export function beginWithdrawOffline(dossier: AccountDossier): void {
  const level = dossier.commission.level

  if (level === 2 || level === 4) {
    dossier.commission.phase = 'animating'
    dossier.commission.animationMs = COMMISSION_ANIMATION_MS[level]
    dossier.commission.animationStartedAt = new Date().toISOString()
    dossier.transfer.status = 'authorizing'
    return
  }

  dossier.commission.phase = 'pay_fee'
  dossier.commission.fee = COMMISSION_FEE_BY_LEVEL[level]
}

/** Оплата комиссии подтверждена. */
export function markFeePaidOffline(dossier: AccountDossier): void {
  const level = dossier.commission.level

  if (level === 3 && dossier.commission.phase === 'policy_build') {
    dossier.commission.policyProgress = 1
    dossier.policy.status = 'issued'
    dossier.policy.etaMinutes = 0
    dossier.commission.phase = 'messenger'
    return
  }

  if (level === 3) {
    dossier.commission.phase = 'policy_build'
    dossier.commission.policyProgress = 0.08
    return
  }

  dossier.commission.phase = 'messenger'
}

/** Анимация перевода дошла до конца — чем он кончился по выбранному уровню. */
export function applyOfflineOutcome(dossier: AccountDossier): void {
  const level = dossier.commission.level
  dossier.commission.animationStartedAt = null

  if (level === 2) {
    dossier.transfer.status = 'suspended'
    dossier.commission.phase = 'suspended'
    dossier.commission.fee = COMMISSION_FEE_BY_LEVEL[2]
    return
  }

  if (level === 4) {
    dossier.transfer.status = 'failed'
    dossier.commission.phase = 'failed'
  }
}

/** Флаг админа: перевести клиента на уровень N. */
export function advanceCommissionLevelOffline(
  dossier: AccountDossier,
  level: CommissionLevel,
): void {
  dossier.commission = defaultCommission(level)

  if (level === 3) {
    dossier.policy.status = 'processing'
    dossier.policy.etaMinutes = 15
  }

  dossier.transfer.status = 'idle'
  dossier.transfer.method = null
  dossier.transfer.accountTail = ''
}
