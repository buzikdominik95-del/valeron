<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Шапка переписки: с кем разговор и когда отвечают.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. Экран переписки отвечает за своё: сколько места
 * занимает лента, как она прокручивается, как складываются пузыри в серии,
 * где стоят разделители суток. Шапка ко всему этому отношения не имеет — у
 * неё свой знак, свои две строки и своя выворотка на тёмной заливке. Вместе
 * они переваливали за предел в 300 строк.
 *
 * ЧАСЫ ПРИЁМА СТОЯТ ЗДЕСЬ, А НЕ ОТДЕЛЬНЫМ БЛОКОМ. Это первое, о чём человек
 * спрашивает, начиная писать в поддержку, и ответ должен быть виден в тот же
 * миг — а не в сноске под лентой, куда ещё надо доскроллить.
 *
 * ЗНАК ДЕКОРАТИВЕН: название команды стоит рядом словами, и второе чтение
 * «изображение: чат» скринридеру ничего не добавляет.
 */
const { t } = useI18n()
</script>

<template>
  <header class="vel-chat__head">
    <span class="vel-chat__mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 6.5h16v10H9l-4 3.5v-3.5H4z"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="miter"
        />
      </svg>
    </span>

    <span class="vel-chat__who">
      <span class="vel-chat__name">{{ t('account.support.chat.team') }}</span>
      <span class="vel-chat__hours">{{ t('account.support.chat.hours') }}</span>
    </span>
  </header>
</template>

<style scoped>
.vel-chat__head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.85rem;
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
}

.vel-chat__mark {
  display: inline-flex;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-round);
  /* Подложка знака — просветление самой заливки, а не отдельный цвет: так
     она остаётся согласованной при любой правке accent-deep. */
  background-color: color-mix(in oklab, var(--color-accent-ink) 16%, transparent);
}

.vel-chat__mark svg {
  inline-size: 1.15rem;
  block-size: 1.15rem;
}

.vel-chat__who {
  display: flex;
  min-inline-size: 0;
  flex-direction: column;
  gap: 0.1rem;
}

.vel-chat__name {
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 78% белого к accent-deep даёт 6.9 при норме 4.5. Приглушённый цвет светлой
   темы здесь дал бы 1.4 — на тёмной заливке он не читается вовсе. */
.vel-chat__hours {
  color: color-mix(in oklab, var(--color-accent-ink) 78%, transparent);
  font-size: 0.72rem;
  line-height: 1.2;
}
</style>
