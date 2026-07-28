import { createI18n } from 'vue-i18n'
import { messages } from '@/locales'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/locales'

// Список локалей живёт в отдельном модуле без импортов: иначе получилось бы
// кольцо i18n → locales → i18n, потому что сборщик сообщений тоже его читает.
export { DEFAULT_LOCALE, SUPPORTED_LOCALES }
export type { AppLocale } from '@/i18n/locales'

/**
 * useGrouping: 'always' обязателен: без него итальянская локаль печатает
 * четырёхзначные числа без разделителя, и минимум калькулятора выглядит
 * как «1000 €» рядом с «22.000 €».
 */
const numberFormats = {
  currency: {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    useGrouping: 'always',
  },
  decimal: {
    style: 'decimal',
    maximumFractionDigits: 0,
    useGrouping: 'always',
  },
  /** TAN / rates — without this, n(x, 'percent') fell back and showed «€». */
  percent: {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  },
} as const

/**
 * Форматы даты и времени. Заведены под переписку с поддержкой, где время
 * стоит у каждой реплики, а над сутками — разделитель.
 *
 * ПОЧЕМУ ЧЕРЕЗ ЛОКАЛЬ, А НЕ toLocaleTimeString НА МЕСТЕ. Язык интерфейса
 * итальянский, а язык браузера у клиента какой угодно: собственный вызов
 * печатал бы время по системной локали, и рядом с итальянским интерфейсом
 * встала бы чужая запись даты. Здесь формат идёт за языком интерфейса.
 *
 * hour12 не задаём: итальянская запись суточная, а навязанный флаг пришлось
 * бы менять при добавлении языка с 12-часовым временем.
 */
const datetimeFormats = {
  /** «14:31» — метка у реплики. */
  time: {
    hour: '2-digit',
    minute: '2-digit',
  },
  /** «26 luglio» — разделитель суток в ленте. */
  day: {
    day: 'numeric',
    month: 'long',
  },
  /** Полная отметка: на экране её нет, она уходит скринридеру. */
  long: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
} as const

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  numberFormats: {
    it: numberFormats,
  },
  datetimeFormats: {
    it: datetimeFormats,
  },
})
