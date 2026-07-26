import { readonly, ref, watch } from 'vue'
import type { DeepReadonly, Ref } from 'vue'
import { useWindowScroll } from '@vueuse/core'

/**
 * Сжатие шапки кабинета при прокрутке.
 *
 * ЗАЧЕМ. Шапка залипшая и высокая: строка с логотипом плюс полоса из пяти
 * шагов — около 160px. На телефоне это четверть экрана, отданная навсегда
 * тому, что человек уже прочитал. Уехав вниз, он смотрит на карточки, а не
 * на путь: путь ему нужен как ориентир, а не как заголовок.
 *
 * ПОЧЕМУ ДВА ПОРОГА, А НЕ ОДИН. С единственным порогом шапка дрожит: она
 * сжимается, страница от этого становится выше, точка прокрутки уезжает
 * обратно за порог, шапка разжимается — и так до бесконечности. Разведённые
 * пороги (сжать на 96, разжать на 40) разрывают эту петлю: между ними есть
 * зона, где состояние не меняется вовсе.
 *
 * ПОЧЕМУ НЕ IntersectionObserver ПО ЯКОРЮ СВЕРХУ. Он дал бы одно событие
 * без гистерезиса — ровно ту самую петлю. Здесь нужны именно два разных
 * числа, и прямое чтение позиции честнее.
 */

/** Ниже этой позиции шапка сжимается, мс — нет, это пиксели прокрутки. */
const CONDENSE_AT = 96
/** Выше этой — разжимается обратно. Разрыв с первым числом и есть гистерезис. */
const EXPAND_AT = 40

export interface HeaderCondense {
  /** true — шапка в сжатом виде. */
  condensed: DeepReadonly<Ref<boolean>>
}

export function useHeaderCondense(): HeaderCondense {
  const { y } = useWindowScroll()
  const condensed = ref(false)

  watch(
    y,
    (value) => {
      if (!condensed.value && value > CONDENSE_AT) {
        condensed.value = true
        return
      }
      if (condensed.value && value < EXPAND_AT) {
        condensed.value = false
      }
    },
    { immediate: true },
  )

  return { condensed: readonly(condensed) }
}
