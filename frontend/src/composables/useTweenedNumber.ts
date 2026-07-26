import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useDocumentVisibility, usePreferredReducedMotion, useRafFn } from '@vueuse/core'

/**
 * Плавно догоняет исходное число: 20 → 21 → 22 … вместо скачка.
 *
 * Нужен именно покадровый счёт, а не CSS-переход: перейти можно у свойства,
 * а текст в разметке переходами не анимируется. Заодно из этого же значения
 * питается положение полосы — так число и полоса идут строго вместе,
 * а не двумя независимыми анимациями, которые разъезжаются на глазах.
 *
 * Кадры даёт useRafFn из VueUse: он сам останавливается при размонтировании.
 */
export function useTweenedNumber(
  source: () => number,
  durationMs = 420,
): Ref<number> {
  const current = ref(source())
  const reduced = usePreferredReducedMotion()
  const visibility = useDocumentVisibility()

  let from = current.value
  let to = current.value
  let elapsed = 0

  const { pause, resume } = useRafFn(
    ({ delta }) => {
      elapsed += delta

      const t = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1
      // ease-out кубический: быстрый старт и мягкая остановка, как у полосы
      const eased = 1 - Math.pow(1 - t, 3)

      current.value = from + (to - from) * eased

      if (t >= 1) {
        current.value = to
        pause()
      }
    },
    { immediate: false },
  )

  watch(source, (next) => {
    /*
     * Мгновенно, без кадров, в двух случаях:
     * — пользователь просил не двигать интерфейс;
     * — вкладка скрыта, и браузер не выдаёт кадры вовсе. Иначе значение
     *   зависло бы на старом до возвращения на вкладку, и пользователь
     *   увидел бы неверный процент в первый же миг.
     */
    if (reduced.value === 'reduce' || visibility.value === 'hidden') {
      current.value = next
      return
    }

    from = current.value
    to = next
    elapsed = 0
    resume()
  })

  return current
}
