import { createSharedComposable, useUrlSearchParams } from '@vueuse/core'

/**
 * Единственный экземпляр параметров адресной строки на всё приложение.
 *
 * ЗАЧЕМ ОБЩИЙ. Экранов, живущих в адресной строке, стало два: мастер (?step=…)
 * и кабинет (?view=account). Каждый useUrlSearchParams держит СВОЮ копию
 * состояния и на запись собирает строку запроса заново — только из того, что
 * знает сам. Две независимые копии затирали бы чужой параметр: включение
 * кабинета выкидывало бы ?step, а любой шаг мастера — ?view. Плюс записи
 * друг друга они не видят: replaceState не поднимает popstate, и вторая копия
 * осталась бы с устаревшим значением, то есть экран продолжал бы считать себя
 * открытым после закрытия.
 *
 * Общий экземпляр решает и то, и другое: состояние одно, и оба композабла
 * (useWizard, useAccountView) читают и пишут в него.
 *
 * Тип-псевдоним, а не interface: useUrlSearchParams требует
 * T extends Record<string, any>, а неявную индексную сигнатуру TypeScript
 * выводит только у псевдонимов. Значения объявлены как string | string[]
 * честно — при ?step=a&step=b VueUse кладёт в состояние массив.
 *
 * Третий параметр — ?tab=… — раздел внутри кабинета (useCabinetTab). Он живёт
 * тут же по той же причине: своя копия useUrlSearchParams при записи вкладки
 * снесла бы ?view=cabinet, то есть переключение раздела выкидывало бы человека
 * из кабинета на лендинг.
 *
 * writeMode 'replace' — как было в мастере: при 'push' его кнопка «назад»
 * добавляла бы в историю запись вперёд, и системная стрелка возила бы
 * пользователя по кругу между теми же двумя шагами. Свою запись в историю
 * экраны добавляют сами при открытии (window.history.pushState).
 */
export type ViewParams = {
  step?: string | string[]
  view?: string | string[]
  tab?: string | string[]
}

export const useViewParams = createSharedComposable(() =>
  useUrlSearchParams<ViewParams>('history', { writeMode: 'replace' }),
)
