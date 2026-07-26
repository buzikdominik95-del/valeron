<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import { REVEAL_MOTION_OK } from '@/composables/useRevealStage'

/**
 * Полоса пройденных шагов: заливка едет при появлении от нуля к своей доле.
 *
 * Отдельный блок, а не кусок трекера: у него своя роль в дереве доступности,
 * своя анимация и свой единственный писатель CSS-переменной. Трекер отдаёт
 * ему числа и подписи — считать их полоса не берётся.
 *
 * Роль progressbar листовая: вложенный span скринридер в ней не читает, и
 * значение целиком передают aria-value*. Доступное имя обязательно — без него
 * объявляется безымянный индикатор; строку компонент себе не выдумывает, её
 * передаёт вызывающая сторона уже переведённой. Приём тот же, что в VelStepDots.
 *
 * aria-valuenow держит НАСТОЯЩЕЕ число пройденных шагов, а не то, что нарисовано
 * в этот кадр: анимация — свойство картинки, а не состояния заявки.
 */
interface Props {
  /** Сколько шагов пройдено. */
  done: number
  /** Сколько шагов всего. */
  total: number
  /** Значение словами: «3 / 5 completati». Уходит в aria-valuetext. */
  valueText: string
  /** Доступное имя. Не называть ariaLabel — Vue примет это за нативный атрибут. */
  label: string
}

const props = defineProps<Props>()

/** Сколько едет заливка при появлении. Полсекунды читаются как рывок, секунда — как ожидание. */
const FILL_TRAVEL_S = 0.9

/* Значения приходят снаружи: дробный или нулевой total дал бы деление на ноль
   и заливку шириной NaN, то есть полосу без заливки вовсе. */
const fraction = computed(() => {
  const total = Math.floor(props.total)
  if (!Number.isFinite(total) || total < 1) return 0

  const done = Number.isFinite(props.done) ? props.done : 0
  return Math.min(1, Math.max(0, done / total))
})

/**
 * Доля, которую полоса показывает В ЭТОТ КАДР. Начальное значение — уже
 * конечное: без разрешения на движение и до первого кадра анимации полоса
 * обязана стоять правильно, а не пустой.
 */
const shown = ref(fraction.value)

/** Твин входа: пока он играет, значение ведёт он. */
let intro: gsap.core.Tween | null = null

const root = useGsapContext(() => {
  /*
   * prefers-reduced-motion — штатным механизмом GSAP: внутри условия ничего не
   * создаётся, и полоса просто стоит заполненной с первого кадра. Уборка на
   * useGsapContext: revert() снимает и matchMedia, созданный внутри контекста.
   *
   * Твин идёт по служебному объекту, а не по элементу: значение обязано попасть
   * в ref — из него его берёт CSS-переменная, и писатель у неё один.
   */
  gsap.matchMedia().add(REVEAL_MOTION_OK, () => {
    const state = { value: 0 }
    shown.value = 0

    intro = gsap.to(state, {
      value: fraction.value,
      duration: FILL_TRAVEL_S,
      ease: 'power2.out',
      onUpdate: () => {
        shown.value = state.value
      },
    })
  })
})

/**
 * Доля уезжает в CSS-переменную на корне: из неё в <style scoped> считается
 * ширина заливки. Инлайн-стили запрещены, а :style в шаблоне — это они и есть.
 * Образец приёма — VelRange и полоса мастера.
 */
watchEffect(
  () => {
    const element = root.value
    if (!element) return
    element.style.setProperty('--vel-fill', String(shown.value))
  },
  { flush: 'post' },
)

/* Шаг закрылся уже после появления — полоса догоняет новое значение. Пока
   играет вход, значение не трогаем: две записи в одну переменную дали бы
   рывок посреди выезда. */
watch(fraction, (value) => {
  if (intro?.isActive() === true) return
  shown.value = value
})
</script>

<template>
  <div
    ref="root"
    class="vel-meter"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="total"
    :aria-valuenow="done"
    :aria-valuetext="valueText"
  >
    <span class="vel-meter__fill"></span>
  </div>
</template>

<style scoped>
.vel-meter {
  /* Запасное значение доли: эффект мог ещё не отработать */
  --vel-fill: 0;

  position: relative;
  height: 0.5rem;
  overflow: hidden;
  border-radius: var(--radius-control);
  /*
    Пустая часть полосы обязана читаться на светлой бумаге: одной заливки
    raised мало — к фону страницы у неё около 1.1:1. Кольцо цветом рамок
    контролов даёт 3.33:1, выше порога 3:1 по критерию 1.4.11. Внутренней
    тенью, а не border: геометрия полосы не должна зависеть от заполнения.
  */
  background-color: var(--color-raised);
  box-shadow: inset 0 0 0 1px var(--color-line-strong);
}

.vel-meter__fill {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: calc(var(--vel-fill) * 100%);
  /* Градиент от глубокого к яркому — как у полосы мастера: заливка набирает
     силу к своему краю, а не лежит однотонной чертой. */
  background-image: linear-gradient(90deg, var(--color-accent-deep), var(--color-accent));
  /* Перехода нет намеренно: ширину ведёт GSAP через --vel-fill,
     и CSS-переход боролся бы с ним за одно и то же свойство. */
}
</style>
