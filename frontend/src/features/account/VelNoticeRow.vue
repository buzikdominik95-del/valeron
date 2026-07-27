<script setup lang="ts">
import type { NoticeTone } from '@/features/account/notice-kinds'

/**
 * Одна строка в панели уведомлений: точка тона, заголовок, пояснение и время.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. Панель отвечает за своё: где висит, как открылась,
 * когда гасит непрочитанное, что показать на пустом списке. Строка к этому
 * отношения не имеет — у неё своя разметка и свои шесть правил оформления.
 * Вместе они переваливали за предел в 300 строк, и правило панели про
 * z-index приходилось искать между цветами точки.
 *
 * ТОЧКА НИЧЕГО НЕ СООБЩАЕТ САМА. Тон — только ускоритель чтения: смысл целиком
 * в заголовке и пояснении справа. Поэтому она aria-hidden, а не «зелёный
 * кружок = успех» (WCAG 1.4.1: цвет не носитель смысла).
 *
 * ВРЕМЯ ПРИХОДИТ УЖЕ ОТФОРМАТИРОВАННЫМ, двумя строками: короткой на экран
 * («14:31») и полной для скринридера («26 июля 2026 г., 14:31»). Формат
 * зависит от языка интерфейса, а язык знает панель — строка только рисует.
 */
defineProps<{
  tone: NoticeTone
  title: string
  body: string
  /** ISO-8601 — для атрибута datetime. */
  at: string
  /** Короткое время на экран. */
  time: string
  /** Полная отметка — голосом. */
  stamp: string
}>()
</script>

<template>
  <li class="vel-notices__item" :class="`vel-notices__item--${tone}`">
    <span class="vel-notices__dot" aria-hidden="true"></span>

    <span class="vel-notices__text">
      <span class="vel-notices__name">{{ title }}</span>
      <span class="vel-notices__body">{{ body }}</span>
      <time :datetime="at" class="vel-notices__time vel-num">
        {{ time }}
        <span class="sr-only">{{ stamp }}</span>
      </time>
    </span>
  </li>
</template>

<style scoped>
.vel-notices__item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius-control);
}

/*
  Разделитель между строками, а не рамка у каждой: у первой строки линии
  сверху быть не должно, иначе она читается как продолжение заголовка панели.

  Соседний селектор работает и через границу компонентов: строки — соседи
  в одном <ul>, а scoped-атрибут у них общий, потому что обе из этого файла.
*/
.vel-notices__item + .vel-notices__item {
  border-block-start: 1px solid var(--color-line);
}

.vel-notices__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  flex: 0 0 auto;
  /* Выравниваем по первой строке заголовка, а не по верху блока: иначе точка
     висит выше текста и читается как маркер списка. */
  margin-block-start: 0.4rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
}

.vel-notices__item--done .vel-notices__dot {
  background-color: var(--color-success);
}

.vel-notices__text {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-notices__name {
  color: var(--color-fg);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-notices__body {
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.vel-notices__time {
  color: var(--color-faint);
  font-size: 0.7rem;
}
</style>
