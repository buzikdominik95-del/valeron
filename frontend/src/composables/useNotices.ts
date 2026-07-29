import { computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useAccountStore } from '@/stores/account.store'
import { useDossierStore } from '@/stores/dossier.store'
import {
  NOTICES_KEEP,
  NOTICES_STORAGE_KEY,
  isNotice,
  type Notice,
  type NoticeKind,
} from '@/features/account/notice-kinds'

/**
 * Уведомления кабинета: список, счётчик непрочитанных и подписка на события,
 * из которых они рождаются.
 *
 * ПОЧЕМУ ОБЩИЙ ЭКЗЕМПЛЯР. На уведомления смотрят двое: точка на колокольчике
 * в шапке и панель, которая открывается по нажатию. Свой экземпляр у каждого
 * означал бы два независимых списка — панель показывает три записи, а точка
 * горит, потому что в её копии их пять.
 *
 * ОТКУДА БЕРУТСЯ ЗАПИСИ. Наблюдатели за состоянием кабинета: отправили
 * снимки, приняли документ, подписали договор, ввели счёт, написали в
 * поддержку. Ни одного «сервер решил» — см. notice-kinds, там про это
 * подробно. Наблюдатель, а не вызов из компонента: событие может случиться
 * на любом экране, и рассыпать по ним push-уведомления значило бы потерять
 * одно из них при первой же перестановке разметки.
 *
 * ПОЧЕМУ НАБЛЮДАТЕЛИ БЕЗ immediate. Флаги переживают перезагрузку; с immediate
 * каждое открытие кабинета заводило бы уведомления обо всём, что человек
 * сделал когда-либо, и список бы дублировался при каждом заходе. Нас
 * интересует ПЕРЕХОД false → true, случившийся на глазах.
 */

interface NoticesApi {
  /** Свежие сверху: список отсортирован при чтении, а не при записи. */
  items: ComputedRef<Notice[]>
  unread: ComputedRef<number>
  hasUnread: ComputedRef<boolean>
  /** Пометить всё прочитанным — зовёт панель при открытии. */
  markAllRead: () => void
  /** Одно уведомление (после клика по строке). */
  markRead: (id: number) => void
  /** Все уведомления данного вида (чат открыт → managerMessage прочитаны). */
  markKindRead: (kind: NoticeKind) => void
  clear: () => void
  /** Завести уведомление вручную. Нужен там, где события нет в сторе. */
  push: (kind: NoticeKind) => void
}

function createNotices(): NoticesApi {
  const account = useAccountStore()
  const stored = useLocalStorage<Notice[]>(NOTICES_STORAGE_KEY, [])

  /*
   * Чиним прочитанное один раз при инициализации: в localStorage лежат записи
   * прошлой выкладки, ручная правка через инструменты разработчика, обрывок
   * прерванной записи. Мусор здесь означал бы строку без текста в панели.
   */
  const restored = Array.isArray(stored.value) ? stored.value.filter(isNotice) : []
  if (restored.length !== stored.value.length) {
    stored.value = restored
  }

  const items = computed(() => [...stored.value].sort((a, b) => b.id - a.id))

  const unread = computed(() => stored.value.filter((notice) => !notice.read).length)

  const hasUnread = computed(() => unread.value > 0)

  /** Следующий номер — от максимума, а не от длины: срезав хвост по
      NOTICES_KEEP, длина повторила бы уже занятые номера. */
  function nextId(): number {
    return stored.value.reduce((max, notice) => Math.max(max, notice.id), 0) + 1
  }

  function push(kind: NoticeKind): void {
    const notice: Notice = {
      id: nextId(),
      kind,
      at: new Date().toISOString(),
      read: false,
    }

    stored.value = [...stored.value, notice].slice(-NOTICES_KEEP)
  }

  function markAllRead(): void {
    if (unread.value === 0) return
    stored.value = stored.value.map((notice) => ({ ...notice, read: true }))
  }

  function markRead(id: number): void {
    stored.value = stored.value.map((notice) =>
      notice.id === id ? { ...notice, read: true } : notice,
    )
  }

  function markKindRead(kind: NoticeKind): void {
    if (!stored.value.some((n) => n.kind === kind && !n.read)) return
    stored.value = stored.value.map((notice) =>
      notice.kind === kind ? { ...notice, read: true } : notice,
    )
  }

  function clear(): void {
    stored.value = []
  }

  /**
   * Заводит уведомление на переходе флага в true.
   *
   * Второе условие — про сам факт перехода: watch срабатывает и когда
   * значение пришло из localStorage при инициализации стора, и тогда prev
   * равен undefined. Без проверки список пополнялся бы при каждом открытии
   * кабинета одними и теми же записями.
   */
  function onceOnTrue(source: () => boolean, kind: NoticeKind): void {
    watch(source, (next, prev) => {
      if (next && prev === false) push(kind)
    })
  }

  onceOnTrue(() => account.documentsUploaded, 'documentSent')
  onceOnTrue(() => account.contractSigned, 'contractSigned')
  onceOnTrue(() => account.ibanProvided, 'ibanAdded')

  /*
   * Воронка: новый этап → «вывод снова доступен» (без номеров уровней).
   * Отказ вывода → «перевод не завершён» (колокольчик).
   */
  const { dossier } = storeToRefs(useDossierStore())

  watch(
    () => dossier.value.commission.level,
    (next, prev) => {
      if (typeof prev !== 'number') return
      if (next > prev) push('withdrawAvailable')
    },
  )

  watch(
    () => dossier.value.commission.phase,
    (next, prev) => {
      if (prev === undefined) return
      if (next === 'failed' && prev !== 'failed') push('withdrawRejected')
    },
  )

  return { items, unread, hasUnread, markAllRead, markRead, markKindRead, clear, push }
}

/** Permanent singleton — not createSharedComposable (dispose → setup crash). */
let noticesSingleton: NoticesApi | null = null

export function useNotices(): NoticesApi {
  if (noticesSingleton) return noticesSingleton
  noticesSingleton = createNotices()
  return noticesSingleton
}

/**
 * Точка на колокольчике. Отдельной функцией, чтобы шапке не тянуть весь
 * набор ради одного логического значения.
 */
export function useNoticeDot(): Ref<boolean> | ComputedRef<boolean> {
  return useNotices().hasUnread
}
