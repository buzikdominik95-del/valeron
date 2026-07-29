/**
 * Модель переписки с поддержкой.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ. На эту форму смотрят трое: композабл, который
 * ведёт ленту, пузырь, который её рисует, и разделители дат, которые считают
 * границы суток. Своя копия у каждого — это разошедшиеся поля при первой же
 * правке.
 *
 * ГРАНИЦА, КОТОРУЮ НЕЛЬЗЯ РАЗМЫВАТЬ. Автор сообщения — это факт, а не
 * оформление: 'client' написал человек, 'agent' написала поддержка. Пока
 * бэкенда нет, сообщений от поддержки в ленте ровно одно — приветствие, и
 * оно помечено как таковое честно. Подставлять «оператор ответил» на таймере
 * нельзя: человек решит, что его прочитали, а его не прочитал никто.
 */

export type ChatAuthor = 'client' | 'agent'

/**
 * Что с отправкой. Пока нет API, дальше 'local' сообщение не уходит, и
 * галочки «доставлено» ему рисовать не за что.
 *
 * local  — лежит в браузере, на сервер не ушло;
 * sent   — сервер принял (появится вместе с API);
 * failed — не ушло, можно повторить.
 */
export type ChatDelivery = 'local' | 'sent' | 'failed'

/** Вложение в чате: фото или любой файл (локальный data URL). */
export type ChatAttachmentKind = 'image' | 'file'

export interface ChatAttachment {
  kind: ChatAttachmentKind
  /** Имя файла для UI и API-пометки. */
  name: string
  /**
   * Превью: предпочтительно blob: (не пишем в localStorage).
   * data: только fallback — strip при persist.
   */
  url: string
  mime: string
  /** Оригинал для upload на бэк (не сериализуется). */
  file?: File
}

/** Убрать тяжёлые data:/blob: URL перед localStorage (QuotaExceeded). */
export function stripHeavyAttachments(list: ChatMessage[]): ChatMessage[] {
  return list.map((m) => {
    const next: ChatMessage = { ...m }
    if (next.imageUrl && /^(data:|blob:)/i.test(next.imageUrl)) {
      delete next.imageUrl
    }
    if (next.attachment) {
      const a = next.attachment
      const lightUrl =
        a.url && !/^(data:|blob:)/i.test(a.url) ? a.url : ''
      next.attachment = {
        kind: a.kind,
        name: a.name,
        mime: a.mime,
        url: lightUrl,
      }
    }
    return next
  })
}

export interface ChatMessage {
  /** Растёт монотонно: ключ для v-for и порядок в ленте. */
  id: number
  author: ChatAuthor
  text: string
  /** ISO-8601. Форматирует под язык экран, а не хранилище. */
  at: string
  delivery: ChatDelivery
  /**
   * Локальное превью фото (data URL). Не уходит на сервер как файл —
   * только отображение в ленте; в API уходит текстовая пометка.
   * @deprecated предпочитайте attachment
   */
  imageUrl?: string
  /** Фото или файл (PDF, doc…). */
  attachment?: ChatAttachment
}

/** Ключ хранилища. Префикс velora: — как у остального состояния кабинета. */
export const CHAT_STORAGE_KEY = 'velora:account:supportThread'

/** Сколько сообщений держим. Лента не архив: старое незачем возить в localStorage. */
export const CHAT_KEEP = 50

/** Не даём отправить пустое и не даём вставить простыню в поле на телефоне. */
export const CHAT_MIN_LENGTH = 2
export const CHAT_MAX_LENGTH = 2000

/** Страж для того, что прочитано из localStorage: там лежит что угодно. */
export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<ChatMessage>
  if (
    typeof item.id !== 'number' ||
    (item.author !== 'client' && item.author !== 'agent') ||
    typeof item.text !== 'string' ||
    typeof item.at !== 'string' ||
    (item.delivery !== 'local' && item.delivery !== 'sent' && item.delivery !== 'failed')
  ) {
    return false
  }
  if (item.imageUrl !== undefined && typeof item.imageUrl !== 'string') return false
  if (item.attachment !== undefined) {
    const a = item.attachment as Partial<ChatAttachment>
    if (
      typeof a !== 'object' ||
      a === null ||
      (a.kind !== 'image' && a.kind !== 'file') ||
      typeof a.name !== 'string' ||
      (a.url !== undefined && typeof a.url !== 'string') ||
      typeof a.mime !== 'string'
    ) {
      return false
    }
  }
  return true
}

/**
 * Нужен ли разделитель даты ПЕРЕД этим сообщением.
 *
 * Сравниваем календарный день, а не разницу в часах: два сообщения в 23:50 и
 * в 00:10 разделены двадцатью минутами, но написаны в разные дни, и человек
 * читает их именно так.
 */
export function startsNewDay(message: ChatMessage, previous: ChatMessage | undefined): boolean {
  if (previous === undefined) return true
  const a = new Date(previous.at)
  const b = new Date(message.at)
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  )
}

/**
 * Последнее ли это сообщение в череде от одного автора. По нему пузырь решает,
 * рисовать ли хвостик и время: в переписке они стоят у последнего сообщения
 * серии, а не у каждого — иначе лента превращается в частокол.
 */
export function endsRun(message: ChatMessage, next: ChatMessage | undefined): boolean {
  return next === undefined || next.author !== message.author
}
