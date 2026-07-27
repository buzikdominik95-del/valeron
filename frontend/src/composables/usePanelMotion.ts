import { onMounted, type Ref } from 'vue'
import { gsap } from 'gsap'
import { useDocumentVisibility } from '@vueuse/core'

const MOTION_OK = '(prefers-reduced-motion: no-preference)'

/**
 * Одноразовый «вход» панели: opacity + y + лёгкий scale.
 * Для карточек, которые не идут через VelStageSwitch (или как доп. polish).
 * GSAP matchMedia + hidden tab = skip (как в мастере).
 */
export function usePanelMotion(root: Ref<HTMLElement | null>, delay = 0): void {
  const visibility = useDocumentVisibility()

  onMounted(() => {
    const el = root.value
    if (!el) return
    if (visibility.value === 'hidden') return

    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 18, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.48,
          delay,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      )
      return () => {
        gsap.set(el, { clearProps: 'all' })
      }
    })
  })
}
