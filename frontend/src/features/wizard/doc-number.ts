/**
 * Правила номера документа на шаге identity.
 * Мягкая, но реальная форма: не «любые цифры», а длина/шаблон по типу.
 */

export type DocTypeKey = 'passport' | 'idCard' | 'licence' | 'residence' | 'other'

export type DocNumberProblem = 'empty' | 'shape' | 'short' | 'long'

interface DocRule {
  /** Минимум значимых символов (без пробелов). */
  min: number
  max: number
  /**
   * После нормализации (верхний регистр, без пробелов/дефисов).
   * null — любой alnum в пределах min…max.
   */
  pattern: RegExp | null
  /** Подсказка-placeholder (IT/RU в i18n). */
  example: string
}

const RULES: Record<DocTypeKey, DocRule> = {
  /* IT: 2 lettere + 7 cifre; допускаем 6–9 cifre per varianti estere. */
  passport: {
    min: 8,
    max: 12,
    pattern: /^[A-Z]{2}[0-9]{6,9}$/,
    example: 'AB1234567',
  },
  /* CIE elettronica ~9; cartacea alfanumerica. */
  idCard: {
    min: 7,
    max: 12,
    pattern: /^[A-Z0-9]{7,12}$/,
    example: 'CA12345AB',
  },
  licence: {
    min: 8,
    max: 12,
    pattern: /^[A-Z0-9]{8,12}$/,
    example: 'U1A234567B',
  },
  residence: {
    min: 6,
    max: 16,
    pattern: /^[A-Z0-9]{6,16}$/,
    example: 'I1234567',
  },
  other: {
    min: 5,
    max: 20,
    pattern: /^[A-Z0-9]{5,20}$/,
    example: 'DOC123456',
  },
}

export function isDocTypeKey(value: string): value is DocTypeKey {
  return value in RULES
}

/** Убрать пробелы/дефисы, верхний регистр — как на бланке. */
export function normalizeDocNumber(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function docNumberExample(docType: string): string {
  if (!isDocTypeKey(docType)) return 'AB1234567'
  return RULES[docType].example
}

/**
 * null — номер годится; иначе причина для i18n.
 * Пустая строка → 'empty' (кнопка и так disabled, но blur может спросить).
 */
export function docNumberProblem(docType: string, raw: string): DocNumberProblem | null {
  if (!isDocTypeKey(docType)) return raw.trim() === '' ? 'empty' : null

  const rule = RULES[docType]
  const value = normalizeDocNumber(raw)
  if (value === '') return 'empty'
  if (value.length < rule.min) return 'short'
  if (value.length > rule.max) return 'long'
  if (rule.pattern !== null && !rule.pattern.test(value)) return 'shape'
  return null
}

export function isDocNumberValid(docType: string, raw: string): boolean {
  return docNumberProblem(docType, raw) === null
}
