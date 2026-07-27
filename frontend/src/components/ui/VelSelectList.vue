<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { selectOptionId } from '@/components/ui/vel-select'
import type { VelSelectOption } from '@/types/velora'

/**
 * Всплывающая часть VelSelect: пункты, их состояния и появление списка.
 *
 * Своей памяти у него нет. Раскрытие, активный пункт и выбранное значение
 * принадлежат контролу — там же остаются фокус (он обязан не уходить с кнопки),
 * общий корень для клика-вне и id, на которые ссылаются aria-controls
 * и aria-activedescendant. Сюда всё это приходит пропами, а наружу уходят два
 * события: «подсветить» и «выбрать».
 *
 * Отдельный файл — из-за объёма разметки и стилей: у пунктов своя зона нажатия,
 * свои признаки выбранного и активного и своя анимация появления, и вместе
 * с кнопкой это перестало помещаться в один читаемый файл. Единственная строка,
 * которую список делит с кнопкой напрямую, — id пункта, и она собирается
 * в общем модуле @/components/ui/vel-select.ts, а не в двух шаблонах.
 *
 * Собственное здесь ровно одно — прокрутка к активному пункту: скроллится
 * список, и знать об этом больше некому.
 */
interface Props {
  /** id списка: на него смотрит aria-controls кнопки */
  listId: string
  /** id кнопки: из него собираются id пунктов */
  triggerId: string
  options: VelSelectOption[]
  /** Значение контрола — им отмечается выбранный пункт */
  selected: string
  expanded: boolean
  /** Индекс активного пункта, −1 когда список свёрнут */
  activeIndex: number
  /** Раскрыться вверх: под кнопкой не хватило места */
  dropUp: boolean
  /** Подпись поля из VelField, если контрол стоит внутри него */
  labelledBy?: string
}

const props = defineProps<Props>()

defineEmits<{
  /** Подсветить пункт под курсором, не выбирая его */
  activate: [index: number]
  choose: [index: number]
}>()

const optionEls = ref<HTMLElement[]>([])

function setOptionEl(element: Element | ComponentPublicInstance | null, index: number): void {
  if (element instanceof HTMLElement) optionEls.value[index] = element
}

/* Активный пункт держим в поле зрения: список скроллится, а фокус остаётся на
   кнопке, так что сам браузер к нему не подъедет. block: 'nearest' двигает
   ровно на нужные пиксели и не дёргает страницу. Прокрутка мгновенная —
   плавную здесь пришлось бы гасить по prefers-reduced-motion.
   Массив элементов не чистим при закрытии: список висит под v-show и не
   размонтируется, ссылки остаются рабочими до смены набора пунктов. */
watch(
  [() => props.expanded, () => props.activeIndex],
  () => {
    if (!props.expanded) return
    optionEls.value[props.activeIndex]?.scrollIntoView({ block: 'nearest' })
  },
  { flush: 'post' },
)
</script>

<template>
  <!-- Список остаётся в разметке и прячется через v-show: так aria-controls
       с кнопки всегда указывает на существующий элемент, а display: none
       убирает свёрнутый список из дерева доступности целиком. -->
  <Transition name="vel-pop">
    <ul
      v-show="expanded"
      :id="listId"
      class="vel-select__list"
      :class="{ 'vel-select__list--up': dropUp }"
      role="listbox"
      :aria-labelledby="labelledBy"
    >
      <li
        v-for="(option, index) in options"
        :id="selectOptionId(triggerId, index)"
        :key="option.value"
        :ref="(element) => setOptionEl(element, index)"
        class="vel-select__option"
        :class="{
          'vel-select__option--selected': option.value === selected,
          'vel-select__option--active': index === activeIndex,
        }"
        role="option"
        :aria-selected="option.value === selected"
        @mousedown.prevent
        @mouseenter="$emit('activate', index)"
        @click="$emit('choose', index)"
      >
        <span class="flex-1">{{ option.label }}</span>

        <!-- Выбранное отмечено не только цветом: галочка держит критерий
             «использование цвета» (WCAG 1.4.1). -->
        <svg
          v-if="option.value === selected"
          class="size-3.5 shrink-0"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="square"
          />
        </svg>
      </li>
    </ul>
  </Transition>
</template>

<style scoped>
.vel-select__list {
  /* Направление сдвига при появлении: список падает сверху вниз,
     а перевёрнутый — снизу вверх, из-под кнопки. */
  --vel-pop-shift: -0.25rem;

  position: absolute;
  /* Растяжка по обоим краям вместо ширины: на узком экране список повторяет
     ширину поля и физически не может выйти за его границы. */
  top: calc(100% + 0.25rem);
  right: 0;
  left: 0;
  z-index: 20;
  /* Высоту считает @/composables/useSelectDrop.ts и кладёт переменную
     на корень контрола — сюда она приходит наследованием. */
  max-height: var(--vel-select-max);
  overflow-y: auto;
  /* Докрутив список до края, не проматываем за ним страницу */
  overscroll-behavior: contain;
  margin: 0;
  padding: 0.25rem 0;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  list-style: none;
}

.vel-select__list--up {
  --vel-pop-shift: 0.25rem;

  top: auto;
  bottom: calc(100% + 0.25rem);
}

.vel-select__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  /* 44px — нижняя граница зоны нажатия по WCAG 2.5.8. Одними полями её тут
     не набрать: строка в 14px даёт 18.9px, и до нормы не хватало пяти пикселей.
     Поэтому высоту держит min-block-size, а поля отвечают только за воздух
     вокруг текста — при переносе на две строки пункт свободно вырастет.
     Тот же приём и по той же причине, что у .vel-link и .vel-skip. */
  min-block-size: 2.75rem;
  padding: 0.625rem 0.875rem;
  color: var(--color-fg);
  font-size: 0.875rem;
  line-height: 1.35;
  cursor: pointer;
}

/* Отклик на само нажатие. До этого пункт отвечал только на --active, который
   вешается по @mouseenter, — то есть на пальце между касанием и закрытием
   списка не происходило ничего. */
.vel-select__option:active {
  background-color: var(--color-track);
}

.vel-select__option--selected {
  color: var(--color-accent);
  font-weight: 500;
}

/* Ниже выбранного по порядку: активный пункт перебивает его цвет.
   Полоса слева — второй признак активности помимо фона, её видно и при
   принудительных цветах системы. */
.vel-select__option--active {
  box-shadow: inset 2px 0 0 var(--color-accent);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

/* Появление: прозрачность и небольшой сдвиг. Анимация, а не transition —
   элемент показывается через v-show, и Vue сам снимает классы по animationend. */
.vel-pop-enter-active {
  animation: vel-pop-in 140ms ease-out;
}

.vel-pop-leave-active {
  animation: vel-pop-in 110ms ease-in reverse;
}

@keyframes vel-pop-in {
  from {
    opacity: 0;
    transform: translateY(var(--vel-pop-shift));
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: анимация всё равно
     проигралась бы, просто мгновенно. Здесь снимаем её целиком. */
  .vel-pop-enter-active,
  .vel-pop-leave-active {
    animation: none;
  }
}
</style>
