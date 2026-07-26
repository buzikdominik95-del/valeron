/**
 * Языки интерфейса. Список из одного элемента — не заготовка под будущее, а
 * решение: сайт обращается к жителям Италии, и второй язык в переключателе
 * означал бы, что часть интерфейса адресована кому-то ещё.
 *
 * Список остаётся списком, а не константой 'it', ровно по одной причине:
 * useLocalStorage и vue-i18n принимают тип AppLocale, и добавление языка
 * сводится к одной строке здесь плюс своему набору строк в @/locales.
 */
export const SUPPORTED_LOCALES = ['it'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'it'
