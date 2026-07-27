import { watch } from 'vue'
import type { Ref } from 'vue'
import { tryOnScopeDispose, usePreferredReducedMotion } from '@vueuse/core'
import autoAnimate from '@formkit/auto-animate'
import type { AnimationController, AutoAnimateOptions } from '@formkit/auto-animate'

/**
 * Плавные переходы внутри контейнера: элемент, который появился, исчез или
 * поменял место, доезжает до нового положения, а соседи расступаются, вместо
 * того чтобы прыгнуть в новую раскладку одним кадром.
 *
 * Обёртка над самим autoAnimate, а не над готовым хуком из
 * '@formkit/auto-animate/vue', по двум причинам:
 *
 * 1. Тот хук отдаёт кортеж [ref, setEnabled], а нам нужен один ref на контейнер.
 * 2. Настройку «не двигать интерфейс» библиотека читает РОВНО ОДИН РАЗ, в момент
 *    подключения (matchMedia внутри autoAnimate), и дальше живёт с этим решением.
 *    Здесь она читается реактивно через VueUse: сменил пользователь системную
 *    настройку — библиотека отцепится или подцепится на лету. При 'reduce'
 *    autoAnimate не вызывается вовсе, поэтому в DOM не появляется ни наблюдателей,
 *    ни интервалов опроса позиций.
 *
 * Чего обёртка НЕ делает и о чём обязан помнить вызывающий:
 *
 * — Библиотека следит только за childList самого контейнера. Смена текста,
 *   классов или атрибутов внутри ребёнка переходом не станет: анимировать нечего.
 *   Вешать её на статический список бессмысленно — это наблюдатели и таймеры
 *   опроса позиций в обмен на ноль анимаций.
 * — Контейнеру нужен display block/flex/grid. У inline и table-раскладок FLIP
 *   считает координаты не по тем боксам, и содержимое разъезжается.
 * — autoAnimate дописывает контейнеру position: relative, если тот статический:
 *   ему нужен предок для абсолютного позиционирования уходящего элемента.
 *   Это делает библиотека, а не разметка, но проверить, что относительное
 *   позиционирование не ломает потомков, обязан тот, кто её подключает.
 */

/**
 * 220мс вместо стандартных 250: интерфейс обязан догонять действие, а не
 * тянуться за ним. Появление библиотека растягивает в полтора раза (330мс) —
 * первую половину новый элемент держится невидимым, чтобы соседи успели
 * разъехаться и он не проявлялся поверх них.
 */
const DURATION_MS = 220

/** ease-out вместо ease-in-out: быстрый старт, мягкая остановка — как у остальных
    переходов проекта (см. useTweenedNumber и .vel-reveal). */
const EASING = 'ease-out'

/**
 * Контейнер приходит снаружи, а не создаётся здесь.
 *
 * Так вызывающий берёт его через useTemplateRef('имя') — и связь с разметкой
 * становится видна компилятору. Со строковым template-ref переменная считалась
 * бы неиспользуемой и падала в noUnusedLocals, а привязать её через :ref нельзя:
 * шаблон разворачивает ссылку и передаёт значение вместо самого объекта.
 */
export function useAutoAnimate(
  target: Readonly<Ref<HTMLElement | null>>,
  options?: Partial<AutoAnimateOptions>,
): void {
  const reducedMotion = usePreferredReducedMotion()

  let controller: AnimationController | undefined

  function detach(): void {
    /*
     * destroy в типах библиотеки помечен необязательным и подписан «для Svelte»,
     * но реализация отдаёт его всегда, и это единственный способ снять то, что
     * autoAnimate завёл: MutationObserver контейнера, ResizeObserver и
     * IntersectionObserver каждого ребёнка и интервалы, которые каждые две
     * секунды перепроверяют координаты. Без него всё это переживает компонент.
     */
    controller?.destroy?.()
    controller = undefined
  }

  watch(
    [target, reducedMotion],
    ([element, motion]) => {
      detach()
      if (!element || motion === 'reduce') return

      controller = autoAnimate(element, {
        duration: DURATION_MS,
        easing: EASING,
        ...options,
      })
    },
    // post: ref из шаблона к этому моменту уже указывает на смонтированный узел
    { flush: 'post' },
  )

  tryOnScopeDispose(detach)
}
