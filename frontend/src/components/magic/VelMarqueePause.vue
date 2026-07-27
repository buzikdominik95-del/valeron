<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Кнопка остановки бегущей ленты — обязательная часть @/components/magic/VelMarquee.vue,
 * а не украшение: движение дольше пяти секунд обязано иметь механизм остановки
 * (WCAG 2.2.2), и наведение мышью его не закрывает.
 *
 * Отдельным файлом, потому что это законченный кусок разметки со своей
 * таблицей стилей: размер цели нажатия, четыре состояния и подпись из словаря
 * не имеют отношения к склейке копий ленты и только мешали читать её стили.
 * Класс остаётся элементом блока ленты (vel-marquee__pause): кнопка живёт
 * в её колонке и своим блоком не является.
 *
 * Состояния кнопка не держит: paused приходит пропом, а нажатие уходит эмитом.
 * Одно и то же значение крутит и подпись здесь, и модификатор корня ленты —
 * двух источников правды у паузы быть не должно.
 */
interface Props {
  /** Лента сейчас стоит: подпись переключается на «продолжить» */
  paused: boolean
}

defineProps<Props>()

defineEmits<{ toggle: [] }>()

const { t } = useI18n()
</script>

<template>
  <button type="button" class="vel-marquee__pause" @click="$emit('toggle')">
    {{ paused ? t('common.marqueeResume') : t('common.marqueePause') }}
  </button>
</template>

<style scoped>
/*
  КНОПКА СВЁРНУТА В ТОЧКУ, ПОКА В НЕЁ НЕ ПРИШЛИ С КЛАВИАТУРЫ. Заказчик просил
  убрать её с глаз: постоянная плашка «Fermare lo scorrimento» над полосой
  партнёров выглядела служебной пометкой посреди витрины.

  Совсем удалить её нельзя, и вот почему. Движение дольше пяти секунд обязано
  иметь механизм остановки — WCAG 2.2.2. Полоса едет бесконечно, и способов
  её остановить в компоненте три: наведение мышью (см. .vel-marquee--hover),
  фокус внутри ленты и эта кнопка. Первые два закрывают мышь и клавиатуру,
  кнопка остаётся единственным ЯВНЫМ и объявляемым управлением — по Tab она
  находится, читается скринридером и разворачивается в настоящую цель нажатия.

  ЧЕСТНО ПРО ОСТАВШУЮСЯ ДЫРУ: на тач-экране нет ни наведения, ни клавиатурного
  фокуса, и добраться до кнопки там теперь нечем. Единственное, что там
  останавливает ленту, — системная настройка «уменьшить движение», а она
  включена не у всех. Закрыть дыру полностью можно только вернув кнопку на
  глаза; выбор внешнего вида против этого сделан сознательно.

  Не display: none и не visibility: hidden: и то, и другое убирает кнопку из
  обхода Tab, то есть выключает ровно тот механизм, ради которого она здесь.
  Схлопывание в точку с clip-path оставляет её фокусируемой.
*/
.vel-marquee__pause {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 1;
  overflow: hidden;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  border: 0;
  clip-path: inset(50%);
  white-space: nowrap;
  background-color: var(--color-ground);
  color: var(--color-faint);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

/*
  Пришли с клавиатуры — кнопка разворачивается в полную цель нажатия 44×44
  (WCAG 2.5.5) и получает сплошную подложку: она встаёт поверх едущих имён,
  и без заливки подпись читалась бы поверх бегущего текста. Левый край ленты
  и без того растушёван маской, так что перекрывает она самую блёклую её часть.
*/
.vel-marquee__pause:focus-visible {
  overflow: visible;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: auto;
  block-size: auto;
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-control);
  clip-path: none;
}

/* Состояния описаны только для развёрнутой кнопки: свёрнутая в точку никаким
   указателем не достаётся, и красить в ней нечего. */
.vel-marquee__pause:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  color: var(--color-accent);
}

.vel-marquee__pause:focus-visible:hover {
  background-color: var(--color-raised);
}

.vel-marquee__pause:focus-visible:active {
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

@media (prefers-reduced-motion: reduce) {
  .vel-marquee__pause {
    transition: none;
  }
}
</style>
