<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/cn'
import { useControlAttrs } from '@/composables/useControlAttrs'
import type { VelButtonVariant } from '@/types/velora'

/**
 * Кнопка проекта. С href превращается в ссылку — тем же оформлением, но
 * с настоящей семантикой перехода.
 *
 * ЗАЧЕМ ССЫЛКА В КНОПКЕ. Кнопка что-то делает, ссылка куда-то ведёт, и подмена
 * второго первым обходится дорого: у кнопки нет ни среднего щелчка, ни
 * контекстного меню, ни адреса в строке состояния, а скринридер объявляет её
 * кнопкой и не даёт перейти по ней из списка ссылок. Оформление при этом одно
 * на оба случая, и копировать длинный набор классов во второй компонент
 * значило бы завести им независимую жизнь.
 */
interface Props {
  /** Только для кнопки: у ссылки атрибута type в этом смысле нет. */
  type?: 'button' | 'submit' | 'reset'
  /**
   * Адрес перехода. Задан — рисуется <a>, и disabled не действует:
   * заблокированных ссылок в HTML не бывает, а aria-disabled оставил бы
   * переход рабочим. Нечего предложить — не выводите контрол вовсе.
   */
  href?: string
  variant?: VelButtonVariant
  size?: 'md' | 'lg'
  block?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
})

defineOptions({ inheritAttrs: false })

const { externalClass, passThrough } = useControlAttrs()

const VARIANT_CLASS: Record<VelButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-dim',
  outline: 'border border-line-strong text-fg hover:border-accent hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-fg',
}

const SIZE_CLASS: Record<'md' | 'lg', string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

const buttonClass = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-control',
    'font-semibold tracking-tight whitespace-nowrap',
    'transition-colors duration-150',
    // cursor-pointer обязателен: preflight Tailwind v4 больше НЕ ставит кнопкам
    // палец — с четвёртой версии они отданы браузерному значению `default`,
    // то есть обычной стрелке. Замер на месте это и показал: у «Accedi»
    // и «Calcola credito» курсор был `default`. Вариант disabled ниже
    // специфичнее (класс + псевдокласс), поэтому заблокированная кнопка
    // по-прежнему показывает `not-allowed`.
    'cursor-pointer',
    // Кольцо фокуса задаётся утилитами намеренно: утилиты Tailwind лежат в слое
    // выше базового, поэтому outline-none здесь погасил бы правило из @layer base
    // и кнопки стали бы невидимы для клавиатуры.
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed disabled:opacity-40',
    SIZE_CLASS[props.size],
    VARIANT_CLASS[props.variant],
    props.block === true && 'w-full',
    // Ссылка приходит с подчёркиванием из base — оформление кнопки его снимает
    props.href !== undefined && 'no-underline',
    externalClass.value,
  ),
)

const isLink = computed(() => props.href !== undefined)
</script>

<template>
  <a v-if="isLink" v-bind="passThrough" :href="href" :class="buttonClass">
    <slot />
  </a>

  <button v-else v-bind="passThrough" :type="type" :class="buttonClass" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
/*
  Отдача на нажатие: кнопка проседает под пальцем и возвращается на место.
  Масштаб, а не цвет: цвет уже занят наведением, а на тач-экране наведения
  не бывает вовсе — там это единственный отклик до того, как что-то произойдёт.

  Селектор без класса: у компонента один корень, и scoped-атрибут делает
  `button[data-v-…]` специфичнее любой утилиты Tailwind. Класс в cn() ради
  этого заводить не нужно, разметка остаётся нетронутой.

  transition-property переписан списком, потому что transition-colors про
  transform не знает, а два объявления перехода на одном элементе не
  складываются — побеждает последнее. Перечислены свойства, которые кнопка
  действительно меняет (варианты правят цвет текста, фон и рамку); значки
  внутри красятся currentColor и едут вместе с color. Цвета сохраняют прежние
  150мс, трансформация идёт быстрее — 100мс, чтобы отдача успевала на короткий
  тап. Функция сглаживания намеренно не задана: остаётся та, что пришла
  с утилитой.
*/
button {
  transition-property: color, background-color, border-color, transform;
  transition-duration: 150ms, 150ms, 150ms, 100ms;
}

/* :not(:disabled) — заблокированная кнопка не нажимается, отдавать ей нечем */
button:active:not(:disabled) {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  /* Глобальный сброс в main.css правит только длительность перехода — сам
     scale остался бы и срабатывал мгновенным скачком. Снимаем его целиком. */
  button:active:not(:disabled) {
    transform: none;
  }
}
</style>
