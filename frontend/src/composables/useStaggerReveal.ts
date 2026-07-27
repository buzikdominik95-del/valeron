import { nextTick, onMounted, watch, type Ref, type WatchSource } from 'vue'
import { gsap } from 'gsap'
import { useDocumentVisibility } from '@vueuse/core'
import { tryOnScopeDispose } from '@vueuse/core'

const MOTION_OK = '(prefers-reduced-motion: no-preference)'

export interface StaggerRevealOptions {
  /** Селектор целей внутри root. По умолчанию — [data-reveal]. */
  selector?: string
  /** Подъём снизу, px. */
  y?: number
  /** Лёгкий scale «из чуть меньшего». 1 = без scale. */
  scale?: number
  /** Длительность одного элемента, с. */
  duration?: number
  /** Задержка между элементами, с (не amount). */
  stagger?: number
  /** Пауза перед всей пачкой, с. */
  delay?: number
  /**
   * Перезапуск при смене источника (шаг drawer, v-if блок).
   * flush post — DOM уже с новым содержимым.
   */
  replayOn?: WatchSource
}

/**
 * Очередное появление блоков/инпутов: opacity + y (+ optional scale).
 * Для форм «первой фазы», drawer-шагов, списков полей.
 *
 * matchMedia + hidden tab: без кадров твин не доезжает — пропускаем.
 * clearProps: не оставляем transform, который ломает fixed/focus-ring.
 */
export function useStaggerReveal(
  root: Ref<HTMLElement | null>,
  options: StaggerRevealOptions = {},
): void {
  const {
    selector = '[data-reveal]',
    y = 16,
    scale = 0.985,
    duration = 0.42,
    stagger = 0.07,
    delay = 0.04,
    replayOn,
  } = options

  const visibility = useDocumentVisibility()
  let mm: gsap.MatchMedia | undefined
  let ctx: gsap.Context | undefined

  function play(): void {
    const el = root.value
    if (!el) return
    if (visibility.value === 'hidden') return

    ctx?.revert()
    ctx = undefined
    mm?.revert()
    mm = undefined

    const targets = el.querySelectorAll<HTMLElement>(selector)
    if (!targets.length) return

    mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          {
            autoAlpha: 0,
            y,
            scale: scale === 1 ? 1 : scale,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration,
            delay,
            stagger,
            ease: 'power3.out',
            clearProps: 'transform,opacity,visibility',
          },
        )
      }, el)

      return () => {
        ctx?.revert()
        ctx = undefined
        gsap.set(targets, { clearProps: 'all' })
      }
    })
  }

  onMounted(() => {
    void nextTick(play)
  })

  if (replayOn !== undefined) {
    watch(
      replayOn,
      () => {
        void nextTick(play)
      },
      { flush: 'post' },
    )
  }

  tryOnScopeDispose(() => {
    ctx?.revert()
    mm?.revert()
  })
}
