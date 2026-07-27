<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useDocumentVisibility } from '@vueuse/core'
import { useWizard } from '@/composables/useWizard'

/**
 * Смена шагов мастера: старый уезжает, новый въезжает с противоположной
 * стороны. Движение здесь служебное — оно отвечает на вопрос «куда я попал»:
 * вперёд по «Avanti» содержимое идёт справа налево, назад по «Indietro» —
 * зеркально. Направление берём из stepIndex, а не из имени шага: порядок
 * задан в useWizard одним списком, и повторять его здесь незачем.
 *
 * Режим out-in выбран сознательно. Одновременный пролёт двух шагов потребовал
 * бы вынуть уходящий из потока (position: absolute), а шаги мастера — формы
 * разной высоты: страница дёргалась бы на каждом переходе. Пауза между
 * уходом и приходом стоит около 0,2 с — за это время содержимое не успевает
 * «пропасть», а слои не накладываются.
 *
 * Внутри шагов есть <Teleport to="#vel-wizard-actions">. Обёртка ему не мешает:
 * телепорт уносит кнопку в подвал оболочки, в анимируемой пластине остаётся
 * только якорь-комментарий. Кнопка «дальше» просто живёт ровно столько,
 * сколько живёт её шаг.
 */
const { step, stepIndex } = useWizard()

/**
 * Скрытой вкладке браузер не выдаёт кадров, а без кадров твин не доходит
 * до конца и не зовёт done — шаг завис бы в полупрозрачном состоянии до
 * возвращения на вкладку. Смотреть на анимацию всё равно некому: меняем
 * шаг мгновенно. Тот же приём и по той же причине — в useTweenedNumber.
 */
const visibility = useDocumentVisibility()

const root = ref<HTMLElement | null>(null)

/** Сдвиг въезда и ухода. Уход короче: он лишь освобождает место. */
const ENTER_SHIFT_PX = 40
const LEAVE_SHIFT_PX = 28
const ENTER_SECONDS = 0.38
const LEAVE_SECONDS = 0.2

/** +1 — идём вперёд, −1 — назад. Считается в момент ухода старого шага. */
let direction = 1
let previousIndex = stepIndex.value

/**
 * Незакрытые done-колбэки Vue. Пока такой колбэк не позван, <Transition>
 * держит шаг в подвешенном состоянии и не пускает следующий. Обычно его
 * зовёт onComplete твина, но если gsap.matchMedia откатит анимацию на лету
 * (пользователь включил «уменьшить движение» прямо во время перехода),
 * onComplete не случится — и мастер замрёт. Поэтому колбэки на учёте.
 */
const pending = new Set<() => void>()

type StepMove = (el: Element, done: () => void) => void

/*
 * Обе функции живут ровно столько, сколько выполняется условие
 * «(prefers-reduced-motion: no-preference)». Пусто — значит движение
 * запрещено, и переход происходит мгновенно.
 */
let moveIn: StepMove | null = null
let moveOut: StepMove | null = null

function release(done: () => void): void {
  pending.delete(done)
  done()
}

/**
 * Переход без анимации. done уходит в следующий тик, и это не украшение.
 * Позвать его прямо в хуке — значит объявить уход законченным, пока Vue ещё
 * патчит дерево: обработчик конца ухода тут же дёргает повторный рендер
 * изнутри незавершённого рендера, и в режиме out-in на месте шага остаётся
 * пустая пластина. Проверено на живой странице: без отсрочки следующий шаг
 * не монтируется вовсе, а вместе с ним пропадает и телепорт кнопки «дальше».
 */
function skip(done: () => void): void {
  void nextTick(done)
}

function animateIn(el: Element, done: () => void): void {
  pending.add(done)

  gsap.fromTo(
    el,
    { autoAlpha: 0, x: direction * ENTER_SHIFT_PX },
    {
      autoAlpha: 1,
      x: 0,
      duration: ENTER_SECONDS,
      ease: 'power2.out',
      /* Инлайновый transform на контейнере — это containing block для всего,
         что внутри позиционировано fixed. Убираем следы за собой сразу,
         а не ждём ctx.revert() при размонтировании. */
      clearProps: 'transform,opacity,visibility',
      onComplete: () => release(done),
    },
  )
}

function animateOut(el: Element, done: () => void): void {
  pending.add(done)

  gsap.to(el, {
    autoAlpha: 0,
    x: -direction * LEAVE_SHIFT_PX,
    duration: LEAVE_SECONDS,
    ease: 'power2.in',
    onComplete: () => release(done),
  })
}

/**
 * Направление считаем здесь, а не в watch на stepIndex: к моменту ухода
 * старого шага состояние уже новое, и разница индексов — готовый ответ.
 * Так порядок срабатывания наблюдателей и хуков <Transition> перестаёт
 * иметь значение.
 */
function onLeave(el: Element, done: () => void): void {
  const current = stepIndex.value
  if (current !== previousIndex) direction = current > previousIndex ? 1 : -1
  previousIndex = current

  if (!moveOut || visibility.value === 'hidden') {
    skip(done)
    return
  }
  moveOut(el, done)
}

function onEnter(el: Element, done: () => void): void {
  if (!moveIn || visibility.value === 'hidden') {
    skip(done)
    return
  }
  moveIn(el, done)
}

let ctx: gsap.Context | undefined

onMounted(() => {
  const scope = root.value
  if (!scope) return

  ctx = gsap.context(() => {
    /*
     * Штатный механизм GSAP вместо ручной проверки настройки: matchMedia сам
     * следит за условием, а при его снятии откатывает всё, что было создано
     * внутри. matchMedia создан внутри контекста, поэтому ctx.revert()
     * прибирает и его — отдельного mm.revert() не требуется.
     */
    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', (_self, contextSafe) => {
      if (!contextSafe) return

      /* contextSafe оборачивает функцию так, что твины, созданные при позднем
         вызове — из хуков <Transition>, — попадают в этот же контекст. Тип
         GSAP отдаёт как Function: сужаем до нашей сигнатуры. */
      moveIn = contextSafe(animateIn) as StepMove
      moveOut = contextSafe(animateOut) as StepMove

      return () => {
        moveIn = null
        moveOut = null
        // Оборванные переходы дозакрываем: без этого мастер завис бы на шаге.
        // Через ту же отсрочку — откат может прийти и посреди чужого рендера.
        pending.forEach((done) => skip(done))
        pending.clear()
      }
    })
  }, scope)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div ref="root" class="vel-step-transition">
    <!--
      :css="false" — движением полностью распоряжается GSAP, и Vue не ищет
      классов перехода, а ждёт done. Ключ по имени шага: без него Vue
      обновил бы ту же пластину на месте, и менять было бы нечего.
    -->
    <Transition :css="false" mode="out-in" @enter="onEnter" @leave="onLeave">
      <div :key="step" class="vel-step-transition__pane">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/*
  Пластина уезжает за край области содержимого. Без обрезки на узком экране
  это дало бы горизонтальную полосу прокрутки на каждом переходе.
  Именно clip, а не hidden: hidden завёл бы здесь скролл-контейнер и отнял
  бы у страницы привычное поведение прокрутки.

  Поле по бокам — не косметика. Поля формы начинались ровно на границе
  обрезки: зазор слева был нулевой, и кольцо фокуса упиралось в край. Даже
  когда оно попадало в запас, вплотную к обрезке оно читается как срезанное
  с одной стороны. Внутреннее поле отодвигает контент от границы, а
  отрицательный внешний отступ возвращает колонку на прежнее место —
  раскладка не меняется ни на пиксель.

  Запас обрезки всё равно оставлен: он страхует тени и кольца, которые
  рисуются за границей элемента.
*/
.vel-step-transition {
  overflow-x: clip;
  overflow-clip-margin: 1rem;
  padding-inline: 0.75rem;
  margin-inline: -0.75rem;
}
</style>
