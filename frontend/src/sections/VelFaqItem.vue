<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useEventListener, usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core'

/**
 * Один вопрос FAQ: строка-аккордеон с номером, вопросом, стрелкой и ответом.
 *
 * Компонент чисто презентационный — номер и тексты приходят готовыми, потому
 * что порядок и состав вопросов решает секция, а не отдельная строка.
 * Корень — сам <details>, поэтому обёртка появления снаружи остаётся прямым
 * ребёнком <ul> и список не теряет семантику.
 *
 * Раскрытие плавное, но семантика нативная: <details>/<summary> дают клавиатуру,
 * поиск по странице и роль кнопки без единого ARIA-атрибута. Скрипт не заменяет
 * этот механизм, а только придерживает атрибут open на время анимации.
 */
interface Props {
  /** Декоративная нумерация вида «01»: собирается по индексу, не переводится */
  number: string
  question: string
  answer: string
}

const props = defineProps<Props>()

/**
 * Длительность раскрытия — одно число на компонент. В CSS оно попадает
 * переменной --vel-faq-duration (её пишет watchEffect ниже, см. <style>),
 * в таймер закрытия — напрямую. Второго места, где эту цифру можно забыть
 * поправить, нет.
 */
const DURATION_MS = 240

const details = ref<HTMLDetailsElement | null>(null)
const summary = ref<HTMLElement | null>(null)

/**
 * Раскрыт ли ответ визуально. Это НЕ атрибут open: при закрытии open держится
 * до конца анимации, иначе браузер убрал бы содержимое из отрисовки в первом же
 * кадре и «плавно закрывать» было бы уже нечего.
 */
const expanded = ref(false)

// 'reduce' — пользователь на уровне ОС попросил не двигать интерфейс.
// Нулевая длительность гасит и переходы, и ожидание перед снятием open:
// ветка кода остаётся одна, разница только в цифре.
const reducedMotion = usePreferredReducedMotion()
const durationMs = computed(() => (reducedMotion.value === 'reduce' ? 0 : DURATION_MS))

// Приём тот же, что в @/components/ui/VelRange.vue: динамика уезжает в
// CSS-переменную на ref-элементе, в разметке инлайн-стилей нет.
watchEffect(
  () => {
    details.value?.style.setProperty('--vel-faq-duration', `${durationMs.value}ms`)
  },
  { flush: 'post' },
)

// Задержка отдана геттером: VueUse читает её в момент start(), поэтому смена
// системной настройки движения подхватывается без пересоздания таймера.
const { start: scheduleClose, stop: cancelClose } = useTimeoutFn(
  () => {
    const element = details.value
    if (element) element.open = false
  },
  () => durationMs.value,
  { immediate: false },
)

function expand(): void {
  const element = details.value
  if (!element) return

  // Повторное раскрытие поверх недоигранного закрытия: таймер обязан умереть,
  // иначе он снимет open уже у раскрытой строки.
  cancelClose()
  element.open = true

  /*
   * Принудительный пересчёт стилей. Пока details закрыт, содержимое не
   * отрисовано вовсе, и без этой строки браузер увидел бы появление элемента
   * и класс раскрытия одним пересчётом: стартового кадра 0fr не существовало
   * бы и переход не запустился. Чтение offsetHeight фиксирует промежуточное
   * состояние «отрисован, но свёрнут», от которого и едет анимация.
   */
  void element.offsetHeight
  expanded.value = true
}

function collapse(): void {
  expanded.value = false
  scheduleClose()
}

useEventListener(summary, 'click', (event: MouseEvent) => {
  if (!details.value) return

  // Нативное переключение отменяем в обе стороны и ставим open сами: только так
  // закрытие успевает проиграться. Enter и Space на <summary> браузер доводит
  // до этого же click, поэтому клавиатура работает ровно как раньше.
  event.preventDefault()

  // Ветвимся по expanded, а не по open: во время закрытия open ещё true, и
  // проверка по нему заставила бы клик закрывать уже закрывающуюся строку.
  if (expanded.value) collapse()
  else expand()
})

useEventListener(details, 'toggle', () => {
  const element = details.value
  if (!element || element.open === expanded.value) return

  // Сюда приходит то, что прошло мимо клика: поиск по странице в Chrome
  // раскрывает details сам. Догоняем анимацией, а не рывком.
  if (element.open) expand()
  else expanded.value = false
})
</script>

<template>
  <!-- Нативные details/summary: раскрытие, клавиатура и поиск по
       странице работают без JS и без ручных ARIA-атрибутов -->
  <details ref="details" class="vel-faq" :class="{ 'vel-faq--expanded': expanded }">
    <summary ref="summary" class="vel-faq__summary group flex items-start gap-4 py-5 pr-1">
      <span class="vel-num mt-1 w-6 shrink-0 text-xs text-faint" aria-hidden="true">
        {{ props.number }}
      </span>

      <!-- Здесь намеренно не <h3>: <summary> отображается в дерево
           доступности как role="button", а у этой роли потомки
           презентационные — заголовок внутри всё равно не был бы
           объявлен. Вопросы доступны как список раскрывающихся кнопок. -->
      <span
        class="flex-1 text-base leading-snug font-medium transition-colors duration-150 group-hover:text-accent sm:text-lg"
      >
        {{ props.question }}
      </span>

      <svg
        class="vel-faq__icon mt-1 size-4 shrink-0 text-muted"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M3.5 6 8 10.5 12.5 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="square"
        />
      </svg>
    </summary>

    <!-- Две обёртки, и обе обязательны: внешняя едет строкой грида 0fr → 1fr
         (единственный способ доехать до авто-высоты без замеров в JS),
         внутренняя режет то, что в эту строку не влезло. -->
    <div class="vel-faq__reveal">
      <div class="vel-faq__inner">
        <!-- .vel-measure вместо max-w-3xl: на 1280 ответ разгонялся до 102 знаков
             в строке при норме около 75. Класс держит меру и едет вместе
             с кеглем, который здесь меняется на sm. -->
        <p class="vel-measure pl-10 text-sm text-muted sm:text-base">
          {{ props.answer }}
        </p>
      </div>
    </div>
  </details>
</template>

<style scoped>
.vel-faq {
  /* Реальное значение пишет скрипт из DURATION_MS. Ноль по умолчанию —
     не «выключенная анимация», а честное поведение страницы, до которой
     скрипт ещё не доехал: нативное мгновенное раскрытие вместо застрявшего
     на нулевой высоте ответа. */
  --vel-faq-duration: 0ms;
}

/* Свой маркер вместо системного треугольника: list-style гасит его в Firefox
   и Chrome, ::-webkit-details-marker — в старых WebKit-сборках и Safari */
.vel-faq__summary {
  list-style: none;
  cursor: pointer;
}

.vel-faq__summary::marker {
  content: '';
}

.vel-faq__summary::-webkit-details-marker {
  display: none;
}

/*
  Нажатие. Наведение (group-hover) и фокус (правило из @layer base) у строки
  уже были, отклика на палец не было: на тач-экране между касанием и началом
  раскрытия строка не менялась ничем.

  Второе правило нужно потому, что у стрелки цвет задан своим классом
  (text-muted) и она currentColor от <summary> не наследует.
*/
.vel-faq__summary:active {
  color: var(--color-accent-deep);
}

.vel-faq__summary:active .vel-faq__icon {
  color: var(--color-accent-deep);
}

/* Высота едет строкой грида: 0fr → 1fr. Проценты и px тут не годятся —
   конечная высота ответа зависит от переноса строк и известна только браузеру. */
.vel-faq__reveal {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--vel-faq-duration) ease;
}

.vel-faq--expanded .vel-faq__reveal {
  grid-template-rows: 1fr;
}

/* overflow: hidden обязателен — без него абзац не помещается в нулевую строку
   и вылезает поверх следующего вопроса. Он же снимает у grid-элемента
   автоматический минимальный размер, иначе строка не сжалась бы до нуля. */
.vel-faq__inner {
  overflow: hidden;
  padding-block-end: 0;
  opacity: 0;
  transition:
    padding-block-end var(--vel-faq-duration) ease,
    opacity var(--vel-faq-duration) ease;
}

.vel-faq--expanded .vel-faq__inner {
  /* Нижний отступ ответа живёт здесь, а не на абзаце: он обязан ехать вместе
     с высотой. Оставь его постоянным — и строка прыгнет на 1.5rem в первом же
     кадре открытия и в последнем кадре закрытия. */
  padding-block-end: 1.5rem;
  opacity: 1;
}

.vel-faq__icon {
  transition: transform var(--vel-faq-duration) ease;
}

/* Поворот привязан к expanded, а не к [open]: стрелка обязана пойти обратно
   в начале закрытия, а не в конце, когда браузер снимет атрибут. */
.vel-faq--expanded .vel-faq__icon {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .vel-faq__reveal,
  .vel-faq__inner,
  .vel-faq__icon {
    transition: none;
  }
}
</style>
