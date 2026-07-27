import { onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'

/**
 * Инерционный скролл лендинга.
 *
 * Подключается ОДИН раз в App.vue и живёт только пока на экране лендинг:
 * в мастере инерция мешает — там короткие экраны, свой поток и программные
 * переводы фокуса при смене шага, которым догоняющая прокрутка только вредит.
 *
 * Главное здесь — связка с ScrollTrigger. Lenis не двигает документ иначе, чем
 * нативный скролл, но ведёт позицию сам, покадрово. Если ScrollTrigger считает
 * свои границы в собственном цикле, он отстаёт на кадр и срабатывает не там,
 * где виден контент. Поэтому:
 *   • lenis.on('scroll', ScrollTrigger.update) — пересчёт ровно по факту сдвига;
 *   • gsap.ticker.add(…) — один кадровый цикл на обоих, свой rAF у Lenis выключен;
 *   • gsap.ticker.lagSmoothing(0) — тикер отдаёт настоящее время, а не подрезанное.
 */

/** Лень догона: заводское значение Lenis. Ниже — ватно, выше — резко. */
const LERP = 0.1

/* Заводские значения gsap.ticker.lagSmoothing(): их надо вернуть, когда Lenis
   сносится, иначе выключенное сглаживание останется на весь остальной сайт. */
const LAG_THRESHOLD_MS = 500
const LAG_ADJUSTED_MS = 33

export function useSmoothScroll(enabled: MaybeRefOrGetter<boolean>): void {
  const motion = usePreferredReducedMotion()

  /* shallowRef обязателен: реактивный прокси на Lenis ломает его внутренние
     сравнения ссылок и дорого стоит на каждом кадре — тот же приём, что
     в @/components/art/VelHeroCanvas.vue. */
  const lenis = shallowRef<Lenis | null>(null)

  /* Метка загрузки: чанк lenis приезжает асинхронно, и за это время условие
     могло перевернуться (пользователь ушёл в мастер). Тогда готовый модуль
     просто выбрасывается, а не создаёт экземпляр-сироту. */
  let loadToken = 0

  /**
   * Единственный кадровый цикл на GSAP и Lenis.
   * gsap.ticker раздаёт время в СЕКУНДАХ, Lenis.raf ждёт МИЛЛИСЕКУНДЫ.
   */
  function tick(time: number): void {
    lenis.value?.raf(time * 1000)
  }

  async function create(): Promise<void> {
    if (lenis.value) return
    const token = (loadToken += 1)

    // Динамический импорт: за инерцию не платят байтами ни те, кто просил
    // не двигать интерфейс, ни те, кто сразу открыл мастер по ссылке.
    const { default: Lenis } = await import('lenis')
    if (token !== loadToken) return

    const instance = new Lenis({
      // Свой requestAnimationFrame Lenis не заводит: кадры раздаёт gsap.ticker.
      autoRaf: false,
      lerp: LERP,
      // Тач остаётся нативным: системная инерция телефона лучше подделки,
      // а syncTouch отбирает у браузера жесты и адресную строку.
      syncTouch: false,
      // Якоря Lenis не перехватывает — их разбирает onAnchorClick ниже:
      // встроенный обработчик прокручивает, но не переводит фокус, а без
      // фокуса ссылка «перейти к содержимому» бессмысленна.
      anchors: false,
    })

    // Порядок важен: сперва ссылка на экземпляр, потом подписки — иначе
    // первый же кадр тикера придёт в null.
    lenis.value = instance
    instance.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(tick)
    /* Без этого gsap после подвисшего кадра подменяет delta своей «безопасной»,
       Lenis получает чужое время и прокрутка спотыкается. */
    gsap.ticker.lagSmoothing(0)

    // Раскладка изменилась: у документа появился инерционный скролл.
    ScrollTrigger.refresh()
  }

  function destroy(): void {
    // Сдвиг метки отменяет незавершённую загрузку чанка.
    loadToken += 1

    const instance = lenis.value
    lenis.value = null
    if (!instance) return

    gsap.ticker.remove(tick)
    gsap.ticker.lagSmoothing(LAG_THRESHOLD_MS, LAG_ADJUSTED_MS)
    // destroy() снимает и слушателей скролла, и свои наблюдатели размера.
    instance.destroy()
    ScrollTrigger.refresh()
  }

  /**
   * Якоря одной страницы при живом Lenis.
   *
   * Нативный переход браузер делает мгновенным прыжком. Пока Lenis дотягивает
   * собственную инерцию (isScrolling === 'smooth'), он этот прыжок не замечает
   * и следующим же кадром возвращает страницу на своё targetScroll — ссылка
   * «перейти к содержимому» выглядит сломанной. Поэтому переход делаем сами:
   * прокрутку отдаём Lenis, а фокус переносим руками — именно перевод фокуса,
   * а не прокрутка, и есть смысл skip-link (у #content для этого tabindex="-1").
   *
   * При prefers-reduced-motion Lenis не создаётся, обработчик выходит сразу
   * и якоря работают нативно — ровно так, как ожидает такой пользователь.
   */
  function onAnchorClick(event: MouseEvent): void {
    const instance = lenis.value
    if (!instance || event.defaultPrevented) return
    // Не левая кнопка или клик с модификатором — это «открыть в новой вкладке».
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    const source = event.target
    if (!(source instanceof Element)) return

    const href = source.closest('a')?.getAttribute('href')
    // Голая решётка (href="#") ведёт в никуда — её оставляем браузеру.
    if (!href || !href.startsWith('#') || href.length < 2) return

    const destination = document.getElementById(decodeURIComponent(href.slice(1)))
    if (!destination) return

    event.preventDefault()
    instance.scrollTo(destination)
    // preventScroll: прокруткой уже занят Lenis, иначе браузер прыгнул бы
    // к цели мгновенно и обогнал бы собственную анимацию.
    destination.focus({ preventScroll: true })
    /* Хеш в адресной строке намеренно не пишем: кнопка «назад» вернула бы
       браузер к якорю нативным прыжком, о котором Lenis не знает. */
  }

  useEventListener(document, 'click', onAnchorClick)

  watch(
    () => toValue(enabled) && motion.value !== 'reduce',
    (on) => {
      if (on) void create()
      else destroy()
    },
    { immediate: true },
  )

  /* То же самое размонтирование, что onUnmounted, но композабл остаётся
     годным и вне компонента: onScopeDispose ловит любую область эффектов. */
  onScopeDispose(destroy)
}
