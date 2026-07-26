import { computed, nextTick, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useAccountStore } from '@/stores/account.store'
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  CHAT_MIN_LENGTH,
  CHAT_STORAGE_KEY,
  isChatMessage,
} from '@/features/account/chat-thread'
import type { ChatMessage } from '@/features/account/chat-thread'

/**
 * Переписка с поддержкой: лента, черновик и отправка.
 *
 * ПОЧЕМУ ЛЕНТА ПЕРЕЖИВАЕТ ПЕРЕЗАГРУЗКУ. Переписка — единственный экран
 * кабинета, где человек ПИШЕТ САМ. Потерять написанное из-за случайного
 * обновления страницы значит заставить набирать заново, и именно этого от
 * чата не ждут: он выглядит как мессенджер, значит и помнить обязан как
 * мессенджер.
 *
 * ЧЕРНОВИК ХРАНИТСЯ ОТДЕЛЬНО ОТ ЛЕНТЫ. Недописанное сообщение — не сообщение:
 * положив его в ленту, мы показали бы человеку отправленным то, что он ещё
 * набирает. Своя запись — и уход с вкладки не теряет полстроки.
 *
 * ГРАНИЦА С СЕРВЕРОМ. Отправленное сообщение получает состояние 'local' и
 * остаётся в браузере: API нет, и «доставлено» ему поставить неоткуда.
 * Автоответов от поддержки здесь нет и не будет до бэкенда — подставить
 * «оператор ответил» на таймере значило бы соврать человеку, что его
 * прочитали. В ленте есть ровно одно сообщение поддержки: приветствие,
 * которое рисуется всегда и ничего не обещает.
 */

/** Приветствие поддержки. Не хранится: это не событие переписки, а заголовок
    экрана, который просто выглядит как первое сообщение. */
export const CHAT_GREETING_ID = 0

export interface SupportChat {
  /** Лента без приветствия — только то, что написал человек. */
  messages: Ref<ChatMessage[]>
  draft: Ref<string>
  /** Можно ли отправить: непустой черновик в допустимых границах. */
  canSend: ComputedRef<boolean>
  /** Сколько ещё символов влезет; отрицательного не бывает. */
  left: ComputedRef<number>
  send: () => void
  /** Корень ленты — к нему подкручиваем низ после отправки. */
  threadEl: Ref<HTMLElement | null>
}

export function useSupportChat(): SupportChat {
  const account = useAccountStore()

  const stored = useLocalStorage<ChatMessage[]>(CHAT_STORAGE_KEY, [])
  const draft = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:draft`, '')
  const threadEl = ref<HTMLElement | null>(null)

  /*
   * Чиним прочитанное один раз при инициализации: в localStorage лежит что
   * угодно — записи прошлой выкладки, ручная правка через инструменты
   * разработчика, обрывок от прерванной записи. Мусор здесь означал бы пузырь
   * без автора и без времени.
   */
  const restored = Array.isArray(stored.value) ? stored.value.filter(isChatMessage) : []
  if (restored.length !== stored.value.length) {
    stored.value = restored
  }

  const messages = stored

  const trimmed = computed(() => draft.value.trim())

  const canSend = computed(
    () => trimmed.value.length >= CHAT_MIN_LENGTH && trimmed.value.length <= CHAT_MAX_LENGTH,
  )

  const left = computed(() => Math.max(0, CHAT_MAX_LENGTH - draft.value.length))

  /** Следующий номер — от последнего, а не от длины: удалив старые записи по
      CHAT_KEEP, длина повторила бы уже занятые номера. */
  function nextId(): number {
    const last = messages.value[messages.value.length - 1]
    return last === undefined ? CHAT_GREETING_ID + 1 : last.id + 1
  }

  async function scrollToEnd(): Promise<void> {
    await nextTick()
    const element = threadEl.value
    if (element === null) return
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }

  function send(): void {
    if (!canSend.value) return

    const message: ChatMessage = {
      id: nextId(),
      author: 'client',
      text: trimmed.value,
      at: new Date().toISOString(),
      delivery: 'local',
    }

    // Срезаем хвост ленты: держать в localStorage всю историю незачем.
    messages.value = [...messages.value, message].slice(-CHAT_KEEP)
    draft.value = ''

    /*
     * Счётчик непрочитанных в меню гасим: человек только что написал сам,
     * то есть он в переписке, и красный кружок на «Assistenza» после этого
     * означал бы непрочитанное, которого нет.
     */
    account.clearSupportUnread()

    void scrollToEnd()
  }

  return { messages, draft, canSend, left, send, threadEl }
}
