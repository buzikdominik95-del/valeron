/**
 * Уведомления кабинета: о чём они бывают и как хранятся.
 *
 * ГЛАВНОЕ ПРАВИЛО, КОТОРОЕ НЕЛЬЗЯ НАРУШАТЬ. Уведомление появляется только о
 * том, что фронт ДЕЙСТВИТЕЛЬНО НАБЛЮДАЛ: человек отправил снимки, подписал
 * договор, закрыл шаг, написал в поддержку. Ни одного уведомления «банк
 * рассмотрел заявку», «оператор ответил» или «средства отправлены» здесь нет
 * и быть не должно: сервера нет, и такие сообщения были бы выдумкой о
 * решении, которого никто не принимал. Появится API — эти виды заведёт он,
 * рядом с событием Reverb, и каждое будет отражать настоящий ответ.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ. Список видов читают трое: тот, кто уведомления
 * заводит, панель, которая их рисует, и страж, который чинит прочитанное из
 * localStorage. Своя копия у каждого — это разошедшиеся ключи локали и
 * уведомление без текста на экране.
 */

/**
 * Виды уведомлений. Ключи латиницей и не зависят от языка: подписи живут
 * в locales/sections/notices.ts под теми же именами.
 */
export const NOTICE_KINDS = [
  /** Снимки документа отправлены на проверку. */
  'documentSent',
  /** Проверка документа завершилась. */
  'documentVerified',
  /** Договор подписан. */
  'contractSigned',
  /** Реквизиты для зачисления введены. */
  'ibanAdded',
  /** Сообщение отправлено в поддержку. */
  'supportSent',
] as const

export type NoticeKind = (typeof NOTICE_KINDS)[number]

/**
 * Насколько уведомление важно. Влияет только на цвет точки и порядок
 * прочтения глазом — смысл несёт текст.
 *
 * done — что-то завершилось удачно;
 * info — что-то произошло и требует внимания не больше, чем строка в списке.
 */
export type NoticeTone = 'done' | 'info'

export const NOTICE_TONE: Record<NoticeKind, NoticeTone> = {
  documentSent: 'info',
  documentVerified: 'done',
  contractSigned: 'done',
  ibanAdded: 'info',
  supportSent: 'info',
}

export interface Notice {
  /** Растёт монотонно: ключ для v-for и порядок в списке. */
  id: number
  kind: NoticeKind
  /** ISO-8601. Форматирует под язык панель, а не хранилище. */
  at: string
  read: boolean
}

/** Ключ хранилища. Префикс velora: — как у остального состояния кабинета. */
export const NOTICES_STORAGE_KEY = 'velora:account:notices'

/**
 * Сколько уведомлений держим. Панель — не архив: двадцати хватает, чтобы
 * увидеть всё, что случилось за сессию, а localStorage не растёт без предела.
 */
export const NOTICES_KEEP = 20

export function isNoticeKind(value: unknown): value is NoticeKind {
  return typeof value === 'string' && (NOTICE_KINDS as readonly string[]).includes(value)
}

/** Страж для того, что прочитано из localStorage: там лежит что угодно. */
export function isNotice(value: unknown): value is Notice {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<Notice>
  return (
    typeof item.id === 'number' &&
    isNoticeKind(item.kind) &&
    typeof item.at === 'string' &&
    typeof item.read === 'boolean'
  )
}
