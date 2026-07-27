import { computed, ref, watchEffect } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * Состояние бегущей ленты: сколько копий слота рисовать, какие модификаторы
 * висят на корне и с каким периодом едет трек.
 *
 * Отделено от @/components/magic/VelMarquee.vue потому, что это поведение,
 * а не оформление: число копий и режим «без движения» решает системная
 * настройка пользователя, и решает на лету. Между шаблоном и двумя сотнями
 * строк таблицы стилей эти три вычисления читались последними, хотя именно
 * они отвечают на вопрос «почему лента выглядит так, а не иначе».
 *
 * Ссылку на корень принимаем снаружи — тем же способом, что и
 * @/composables/usePanelMotion.ts: элемент нужен ровно затем, чтобы положить
 * на него CSS-переменную, а объявляет его через ref="root" всё равно шаблон.
 */

/**
 * То, что лента берёт из пропсов компонента. Поля и их смыслы — один в один
 * Props в @/components/magic/VelMarquee.vue, там же и подробности.
 *
 * Принимаем объект целиком, а не по одному значению: сюда приходит реактивный
 * props компонента, и чтение полей внутри computed само подписывает ленту
 * на их смену.
 */
export interface MarqueeSettings {
  durationMs: number
  reverse: boolean
  pauseOnHover: boolean
  repeat: number
}

export interface MarqueeApi {
  /** Едет ли лента вообще. false — статичный режим без движения и без копий. */
  animated: ComputedRef<boolean>
  /** Пауза по кнопке. Пишется снаружи — переключает её VelMarqueePause. */
  paused: Ref<boolean>
  /** Сколько раз повторить слот в разметке. */
  copies: ComputedRef<number>
  /** Модификаторы корня ленты. */
  rootClass: ComputedRef<string[]>
}

export function useMarquee(root: Ref<HTMLElement | null>, settings: MarqueeSettings): MarqueeApi {
  /* 'reduce' — пользователь на уровне ОС попросил не двигать интерфейс.
     Значение реактивно: смена системной настройки перестраивает ленту на лету. */
  const motion = usePreferredReducedMotion()
  const animated = computed(() => motion.value !== 'reduce')

  const paused = ref(false)

  /**
   * Число копий в разметке. Без анимации копия нужна ровно одна: дубликаты
   * существуют только ради бесшовности хода, а статичному ряду они не нужны —
   * и гасить их через display было бы хуже, чем не рендерить вовсе.
   *
   * Нижняя граница 2, а не 1: одинокая копия уехала бы за край и оставила
   * пустоту до конца периода. Верхняя — защита от опечатки в пропсе.
   */
  const copies = computed(() => {
    if (!animated.value) return 1
    const count = Number.isFinite(settings.repeat) ? Math.trunc(settings.repeat) : 4
    return Math.min(Math.max(count, 2), 16)
  })

  const rootClass = computed(() => [
    animated.value ? 'vel-marquee--run' : 'vel-marquee--static',
    settings.reverse ? 'vel-marquee--reverse' : '',
    settings.pauseOnHover ? 'vel-marquee--hover' : '',
    paused.value ? 'vel-marquee--paused' : '',
  ])

  // Период уходит в CSS-переменную на корне: инлайн-стилей в разметке нет,
  // приём тот же, что в @/components/ui/VelRange.vue.
  watchEffect(
    () => {
      const element = root.value
      if (!element) return
      const duration =
        Number.isFinite(settings.durationMs) && settings.durationMs > 0 ? settings.durationMs : 40000
      element.style.setProperty('--vel-marquee-duration', `${duration}ms`)
    },
    { flush: 'post' },
  )

  return { animated, paused, copies, rootClass }
}
