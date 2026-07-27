<script setup lang="ts">
import { useDebounceFn, useEventListener, useResizeObserver } from '@vueuse/core'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGsapContext } from '@/composables/useGsapContext'
import {
  batchReveal,
  provideRevealStage,
  REVEAL_MOTION_OK,
  REVEAL_SELECTOR,
  revealNow,
} from '@/composables/useRevealStage'

/**
 * Сцена секции: один gsap.context на раздел, одна пачка, один stagger.
 *
 * Заменяет собой корневой тег секции, а не оборачивает его: лишний контейнер
 * между <main> и <section> ничего не даёт, зато способен утащить за собой
 * grid-раскладку. Классы и aria-* приходят снаружи и попадают на корень
 * сквозным наследованием атрибутов.
 *
 * Зачем сцена вообще нужна. Отставание заголовка от подзаголовка и карточек
 * друг от друга — это ОДИН твин со stagger, а не десяток твинов с задержками,
 * посчитанными руками в разметке. Разница видна при правке: чтобы изменить темп
 * каскада на всём сайте, правится одно число в @/composables/useRevealStage.ts,
 * а не delay-ms в восьми секциях.
 *
 * Цели сцена собирает по метке data-vel-reveal, которую ставит себе
 * @/components/ui/VelReveal.vue. Поиск идёт от корня сцены — соседние секции
 * в выборку не попадают даже теоретически.
 */
interface Props {
  /** Тег корня: секции лендинга — section, но сцена не обязана быть секцией */
  as?: string
}

withDefaults(defineProps<Props>(), {
  as: 'section',
})

// Объявляемся сценой в setup, до того как дети решат свою судьбу:
// VelReveal внутри увидит нас и не станет заводить собственный ScrollTrigger.
provideRevealStage()

const root = useGsapContext(() => {
  const element = root.value
  if (!element) return

  // Выборка от корня сцены — та самая причина, по которой контексту передаётся
  // scopeElement. Ниже по дереву может лежать что угодно, но чужого мы не берём.
  const targets = Array.from(element.querySelectorAll(REVEAL_SELECTOR))
  if (targets.length === 0) return

  /*
   * Штатный механизм GSAP вместо ручной проверки настройки. Внутри условия
   * создаётся и скрытое состояние, и ScrollTrigger.batch — значит при
   * 'reduce' не создаётся НИЧЕГО: секция просто стоит на месте видимой.
   * А если пользователь переключит настройку на ходу, matchMedia сам откатит
   * или заново соберёт всё созданное внутри.
   *
   * Сам matchMedia создан внутри gsap.context и уедет вместе с ним по
   * ctx.revert() — отдельной уборки не требуется.
   */
  gsap.matchMedia().add(REVEAL_MOTION_OK, () => {
    batchReveal(targets)
  })
})

/*
 * Фокус важнее очереди. Клавиатура умеет уйти в блок, который ещё не проявился:
 * focusin всплывает до сцены, и блок показывается мгновенно, без ожидания
 * скролла. Слушатель — из @vueuse/core, он снимается при размонтировании сам.
 */
useEventListener(root, 'focusin', (event: Event) => {
  const node = event.target
  if (!(node instanceof Element)) return
  const target = node.closest(REVEAL_SELECTOR)
  if (target) revealNow(target)
})

/*
 * Раскладка меняется не только от размера окна: смена языка переписывает все
 * тексты, и высоты секций уезжают вместе с ними. Окно при этом не меняется,
 * поэтому собственный пересчёт ScrollTrigger не запустится, и точки входа
 * останутся от старой вёрстки. ResizeObserver ловит ровно этот случай.
 *
 * refresh() глобальный и не из дешёвых, поэтому он один на всё приложение
 * и отложен: восемь сцен, отреагировавших на одну смену языка, дадут один
 * вызов, а не восемь.
 */
const refreshScrollTriggers = useDebounceFn(() => ScrollTrigger.refresh(), 200)
useResizeObserver(root, refreshScrollTriggers)
</script>

<template>
  <component :is="as" ref="root">
    <slot />
  </component>
</template>
