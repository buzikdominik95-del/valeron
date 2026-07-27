/** Цели кредита — совпадают со значениями select на боевом сайте. */
export const CREDIT_PURPOSES = [
  'auto',
  'personal',
  'travaux',
  'consolidamento',
  'altro',
] as const

export type CreditPurpose = (typeof CREDIT_PURPOSES)[number]

/** Страж для значений, пришедших извне — из localStorage, URL или ответа API. */
export function isCreditPurpose(value: unknown): value is CreditPurpose {
  return typeof value === 'string' && CREDIT_PURPOSES.includes(value as CreditPurpose)
}

export type VelButtonVariant = 'primary' | 'outline' | 'ghost'

export interface VelSelectOption {
  value: string
  label: string
}

/** Контекст, который VelField отдаёт вложенному контролу. */
export interface VelFieldContext {
  /** Для одиночного labelable-контрола: на него указывает <label for>. */
  controlId: string
  /** Для группы контролов (степпер): она ссылается сюда через aria-labelledby. */
  labelId: string
  describedBy: string | undefined
  invalid: boolean
}
