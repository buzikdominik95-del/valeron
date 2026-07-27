import { computed, watchEffect } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useElementBounding, useWindowSize } from '@vueuse/core'

/**
 * Куда раскрыть список и сколько высоты ему отдать.
 *
 * Список абсолютный и растянут по ширине триггера, поэтому за боковой край
 * экрана он не вылезает ни при какой ширине. Остаётся высота: у нижнего края
 * окна места под список может не быть.
 *
 * Вынесено из VelSelect.vue отдельным файлом: это единственная часть контрола,
 * которая занимается измерениями окна, и рядом с разметкой и ARIA она читалась
 * хуже, чем сама по себе. Пара к @/composables/useSelectListbox.ts: там чистое
 * состояние без обращений к DOM, здесь только геометрия.
 */

/** Отступ от края окна, чтобы список не прилипал к нему вплотную */
const EDGE_GAP = 12
/** Ниже этой высоты список становится щелью — тогда лучше раскрыться вверх */
const COMFORT_HEIGHT = 200
/** Меньше этого не опускаемся даже в самом тесном окне */
const MIN_HEIGHT = 120

export interface SelectDropParams {
  /** Корень контрола: на нём заводится CSS-переменная с высотой списка */
  root: Ref<HTMLElement | null>
  /** Кнопка-триггер: от неё считается место сверху и снизу */
  trigger: Ref<HTMLElement | null>
}

export interface SelectDrop {
  /** Раскрываться вверх, из-под кнопки */
  dropUp: ComputedRef<boolean>
}

export function useSelectDrop(params: SelectDropParams): SelectDrop {
  const { top: triggerTop, bottom: triggerBottom } = useElementBounding(params.trigger)
  const { height: viewportHeight } = useWindowSize()

  const spaceBelow = computed(() => viewportHeight.value - triggerBottom.value - EDGE_GAP)
  const spaceAbove = computed(() => triggerTop.value - EDGE_GAP)
  const dropUp = computed(
    () => spaceBelow.value < COMFORT_HEIGHT && spaceAbove.value > spaceBelow.value,
  )

  const maxListHeight = computed(() =>
    Math.round(Math.max(dropUp.value ? spaceAbove.value : spaceBelow.value, MIN_HEIGHT)),
  )

  /* Высота уезжает в CSS-переменную на корне: инлайн-стили запрещены,
     а :style в шаблоне — это они и есть. Образец приёма — VelRange. */
  watchEffect(
    () => {
      const element = params.root.value
      if (!element) return
      element.style.setProperty('--vel-select-max', `${maxListHeight.value}px`)
    },
    { flush: 'post' },
  )

  return { dropUp }
}
