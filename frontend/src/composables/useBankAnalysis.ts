import { computed, ref } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import { fastAnimMs } from '@/lib/fast-anim'

/**
 * ВРЕМЕННЫЙ ИСТОЧНИК-ЗАГЛУШКА.
 *
 * Опрос банков здесь имитируется таймером, но форма данных задана не «как удобно
 * заглушке», а специально совпадает с будущими событиями Laravel Reverb: бэкенд
 * будет слать в канал заявки ровно такие объекты — тот же id, то же имя, тот же
 * набор статусов pending → checking → verified.
 *
 * Поэтому замена источника — правка ТОЛЬКО этого файла: start()/stop() превратятся
 * в подписку и отписку от канала, а место, где сейчас крутятся таймеры, займёт
 * обработчик события. Компоненты не трогаются: они видят те же banks/progress/isDone.
 *
 * Заглушка опрашивает банки НЕ строго по одному, а несколькими параллельными
 * полосами — и это тоже не «как удобно»: настоящий бэкенд рассылает запросы
 * партнёрам одновременно, и ответы приходят вперемешку. Компоненты обязаны
 * уметь показывать несколько строк в статусе checking сразу уже сейчас,
 * иначе подключение Reverb сломало бы экран.
 */

export type BankStatus = 'pending' | 'checking' | 'verified'

export interface BankRow {
  id: string
  name: string
  status: BankStatus
}

/**
 * Имена банков — имена собственные: не переводятся и через i18n не идут.
 * id совпадает с тем, что пришлёт бэкенд, поэтому он записан явно,
 * а не выводится из имени: имя — витрина, id — ключ.
 *
 * Экспортируется, потому что тот же список показывает лента партнёров
 * (@/sections/VelBankStrip.vue). Второй копии массива быть не должно:
 * состав партнёров обязан совпадать в мастере и на витрине.
 */
export const BANKS: readonly Omit<BankRow, 'status'>[] = [
  { id: 'bnp-paribas', name: 'BNP Paribas' },
  { id: 'societe-generale', name: 'Societe Generale' },
  { id: 'credit-agricole', name: 'Credit Agricole' },
  { id: 'santander', name: 'Santander' },
  { id: 'hsbc', name: 'HSBC' },
  { id: 'revolut', name: 'Revolut' },
  { id: 'deutsche-bank', name: 'Deutsche Bank' },
  { id: 'ing', name: 'ING' },
  { id: 'bbva', name: 'BBVA' },
  { id: 'unicredit', name: 'UniCredit' },
  { id: 'intesa-sanpaolo', name: 'Intesa Sanpaolo' },
  { id: 'commerzbank', name: 'Commerzbank' },
  { id: 'barclays', name: 'Barclays' },
]

/**
 * СКОЛЬКО ИДЁТ ПРОВЕРКА ОДНОГО БАНКА.
 *
 * Проверка идёт СТРОГО ПО ОДНОМУ БАНКУ ЗА РАЗ — так просил владелец продукта, и так
 * честнее выглядит: по списку идёт одна волна сверху вниз, а не три полосы,
 * которые перескакивают друг через друга. Когда одновременно горели три
 * строки, взгляду было не за что зацепиться: он метался между ними и не
 * успевал ни за одной.
 *
 * ДЛИТЕЛЬНОСТЬ ЗАДАНА ВЛАДЕЛЬЦЕМ ПРОДУКТА: семь секунд на банк. Прежние
 * 0.9–1.4 с он назвал слишком быстрыми — строка успевала мигнуть, и проверка
 * читалась как формальность.
 *
 * ЧТО ЭТО ЗНАЧИТ ПО ОБЩЕМУ ВРЕМЕНИ, и это надо понимать: тринадцать банков по
 * семь секунд — это полторы минуты, пока экран занят. Решение осознанное, но
 * ускоритель ?fastAnim=1 после него обязателен для прогонов, иначе каждый
 * автотест платит эти же полторы минуты (с флагом выходит около 18 секунд).
 *
 * Разброс, а не одно число: одинаковые интервалы подряд слышны как метроном.
 * Целевая длительность проверки банка ~4 с (±6%), не 7 с.
 *
 * ПОЛОСА В СТРОКЕ ЖИВЁТ СТОЛЬКО ЖЕ. Длительность заливки в VelBankRow берётся
 * из --vel-bank-load-ms = CHECK_AVG_MS.
 */
const CHECK_MIN_MS = 3760
const CHECK_MAX_MS = 4240

/**
 * Средняя длительность проверки — её и берёт полоса заливки в строке.
 * Именно среднее, а не случайное значение конкретного банка: полоса заводится
 * css-анимацией, у которой длительность фиксируется в момент старта, и
 * подгонять её под каждый банк пришлось бы отдельным свойством на каждую
 * строку. Разброс ±6% на глаз в полосе неразличим.
 */
export const CHECK_AVG_MS = (CHECK_MIN_MS + CHECK_MAX_MS) / 2

export function useBankAnalysis() {
  const banks = ref<BankRow[]>(BANKS.map((bank) => ({ ...bank, status: 'pending' })))
  const running = ref(false)

  /*
   * Таймеры проверок — по одному на занятую полосу, поэтому useTimeoutFn здесь
   * больше не годится: он ведёт РОВНО ОДИН таймер, а полос теперь несколько.
   * Набор, а не массив: снятый таймер надо удалить по значению, и delete у Set
   * дешевле, чем поиск индекса в массиве на каждом завершении.
   */
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const checkedCount = computed(
    () => banks.value.filter((bank) => bank.status === 'verified').length,
  )

  const progress = computed(() =>
    banks.value.length === 0 ? 100 : Math.round((checkedCount.value / banks.value.length) * 100),
  )

  const isDone = computed(() => checkedCount.value === banks.value.length)

  /**
   * Длительность одной проверки. Считается на КАЖДЫЙ банк отдельно: и разброс,
   * и флаг ускорения обязаны читаться в момент планирования, а не один раз
   * на всю сессию.
   */
  function checkDelayMs(): number {
    return fastAnimMs(CHECK_MIN_MS + Math.random() * (CHECK_MAX_MS - CHECK_MIN_MS))
  }

  /** Ставит банку его собственный таймер и запоминает, чтобы было что снять. */
  function scheduleCheck(bank: BankRow): void {
    const timer = setTimeout(() => {
      timers.delete(timer)
      bank.status = 'verified'
      pump()
    }, checkDelayMs())

    timers.add(timer)
  }

  /**
   * Берёт в работу СЛЕДУЮЩИЙ банк — ровно один.
   *
   * Условие «уже кто-то проверяется» считается по СОСТОЯНИЮ списка, а не по
   * числу таймеров: после stop() банк остаётся в checking без таймера, и счёт
   * по таймерам взял бы его же в работу второй раз.
   */
  function pump(): void {
    const busy = banks.value.some((bank) => bank.status === 'checking')

    if (!busy) {
      const next = banks.value.find((bank) => bank.status === 'pending')
      if (next) {
        next.status = 'checking'
        scheduleCheck(next)
      }
    }

    running.value = timers.size > 0
  }

  function start(): void {
    if (running.value) return

    /* Банки, застрявшие в checking после stop(), остались без таймеров —
       вооружаем их заново, иначе продолжение перескочило бы через них
       и опрос никогда бы не завершился. */
    for (const bank of banks.value) {
      if (bank.status === 'checking') scheduleCheck(bank)
    }

    pump()
  }

  /** Останавливает опрос и оставляет статусы как есть — ничего не откатывает. */
  function stop(): void {
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    running.value = false
  }

  // Снимаем таймеры сами: своего владельца у setTimeout нет, и композабл может
  // пережить размонтирование компонента, если его подняли выше по дереву.
  tryOnScopeDispose(stop)

  return { banks, checkedCount, progress, isDone, start, stop }
}
