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
  Кнопка паузы видна ВСЕГДА, а не только при фокусе с клавиатуры.
  Прежний вариант (свёрнута в точку до :focus-visible) оставлял тач-экраны
  без способа остановить ленту: там нет ни курсора, ни клавиатурного фокуса.
  Движение дольше пяти секунд обязано иметь видимый способ остановки —
  WCAG 2.2.2. Поэтому кнопка тихая, но настоящая.
*/
.vel-marquee__pause {
  display: inline-flex;
  align-items: center;
  /* Цель нажатия: замер до правки давал 137×30.5. Ленту останавливают на ходу,
     часто пальцем и часто в спешке — этой кнопке нужны полные 44×44, а не
     нижняя граница нормы. Кнопка стоит своей строкой над лентой, поэтому
     высота растёт вниз от неё и ничего не перекрывает; ширины у подписи
     и без того с запасом, min-inline-size здесь на случай короткого перевода. */
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
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

/* Нажатие: у кнопки были покой, наведение и фокус, отклика на палец не было. */
.vel-marquee__pause:active {
  background-color: var(--color-raised);
  border-color: var(--color-accent);
  color: var(--color-accent-deep);
}

.vel-marquee__pause:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.vel-marquee__pause:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
  .vel-marquee__pause {
    transition: none;
  }
}
</style>
