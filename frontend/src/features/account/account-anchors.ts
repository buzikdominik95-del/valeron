import type { AccountStep } from '@/stores/account.store'

/**
 * Куда ведут ссылки «Vai», «Carica subito» и «Firma subito».
 *
 * Кабинет — один экран, и оба незакрытых шага закрываются на нём же: панель
 * документов и панель подписи стоят ниже, в тех же слотах оболочки. Поэтому
 * действие шага это ЯКОРЬ, а не кнопка-обещание: настоящая ссылка работает
 * средним щелчком и с клавиатуры, а маршрутизации, которую можно было бы
 * позвать, на фронте нет вовсе.
 *
 * Отдельный модуль, потому что список делят трое: трекер и блок «Prossimi
 * passi» ставят ссылки, а оболочка (VelAccount) вешает эти же идентификаторы
 * на свои слоты. Разъехавшиеся строки дали бы ссылку в пустоту.
 *
 * Шаги, которых здесь нет, закрывает система — вести по ним некуда.
 */
export const ACCOUNT_STEP_ANCHOR: Partial<Record<AccountStep, string>> = {
  /** Шаг «Account» — вкладка профиля (личные данные). */
  account: 'vel-account-profile',
  documents: 'vel-account-documents',
  signature: 'vel-account-signature',
}

/** Ссылка на панель шага. undefined — у шага нет своего места на экране. */
export function accountStepHref(step: AccountStep): string | undefined {
  const id = ACCOUNT_STEP_ANCHOR[step]
  return id === undefined ? undefined : `#${id}`
}

/** Шаги, которые пользователь дожимает с трекера (3 и 5 + документы). */
export const ACCOUNT_CLICKABLE_STEPS: readonly AccountStep[] = [
  'account',
  'documents',
  'signature',
]
