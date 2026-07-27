<script setup lang="ts">
import type { AccountStep, AccountStepStatus } from '@/stores/account.store'
import VelAccountIcon from '@/features/account/VelAccountIcon.vue'

/**
 * Одна строка списка шагов на Home: знак шага, название, состояние.
 *
 * ЧТО СТОИТ СПРАВА. У пройденного шага — галочка, у того, который человек
 * закрывает сам, — ссылка «Vai», у остального — ничего. Это и есть «состояние»
 * строки на эталоне: слева знак отвечает на «какой это шаг», справа знак или
 * ссылка — на «что с ним». Абзаца-пояснения под строкой нет намеренно: он
 * пересказывал название и растил экран втрое.
 *
 * ОТДЕЛЬНЫЙ ФАЙЛ, потому что вместе с разметкой строки уезжают и её стили —
 * три состояния кружка, цвет названия, цель нажатия ссылки. В трекере это
 * две трети всего блока, и он переставал помещаться в 300 строк.
 *
 * СТРОКИ ПРИХОДЯТ ПЕРЕВЕДЁННЫМИ. Ключи i18n знает список, а строка — только
 * свою разметку: тот же приём, что у VelTrackerStep и VelStepMeter.
 *
 * ТРИ СОСТОЯНИЯ РАЗЛИЧАЮТСЯ НЕ ТОЛЬКО ЦВЕТОМ: пройденный — заливка кружка и
 * галочка справа, текущий — кольцо и жирное название, предстоящий — тонкий
 * контур. Плюс строка в .sr-only, которая называет состояние словами: без неё
 * при дальтонизме и в режиме принудительных цветов список превращается в пять
 * одинаковых строк (WCAG 1.4.1).
 *
 * ССЫЛКА, А НЕ КНОПКА: «Vai» ведёт на панель ниже по странице (см.
 * account-anchors.ts), маршрутизации на фронте нет.
 */
defineProps<{
  /** Идентификатор шага — из него берётся знак слева. */
  kind: AccountStep
  status: AccountStepStatus
  /** Название шага — то, что видно. */
  title: string
  /** Состояние словами: «Completato», «In corso», «Da completare». */
  statusLabel: string
  /** Видимая подпись ссылки. undefined — шаг закрывает система, вести некуда. */
  goText: string | undefined
  href: string | undefined
  /** Полное имя ссылки: одно слово «Vai» не говорит, куда она ведёт. */
  goLabel: string
}>()
</script>

<template>
  <li
    class="vel-step-row"
    :class="`vel-step-row--${status}`"
    :aria-current="status === 'current' ? 'step' : undefined"
  >
    <span class="vel-step-row__mark" aria-hidden="true">
      <VelAccountIcon :kind="kind" />
    </span>

    <span class="vel-step-row__title">{{ title }}</span>

    <!-- Состояние словами: глазами его передают галочка, кольцо и цвет -->
    <span class="sr-only">{{ statusLabel }}</span>

    <span v-if="status === 'done'" class="vel-step-row__done" aria-hidden="true">
      <VelAccountIcon kind="check" />
    </span>

    <a
      v-else-if="href !== undefined && goText !== undefined"
      class="vel-step-row__go"
      :href="href"
      :aria-label="goLabel"
    >
      {{ goText }}
      <span aria-hidden="true">→</span>
    </a>
  </li>
</template>

<style scoped>
.vel-step-row {
  /* Диаметр кружка со знаком — одним числом на оба его размера */
  --vel-mark: 1.75rem;

  display: flex;
  align-items: center;
  gap: 0.75rem;
  /* Строка ровно с цель нажатия ссылки «Vai» (2.75rem). Иначе ссылка была бы
     выше своей строки и краями залезала в соседнюю: палец у границы попадал
     бы не в тот шаг. Заодно все пять строк одной высоты — со ссылкой и без. */
  min-block-size: 2.75rem;
}

.vel-step-row__mark {
  --vel-icon-size: 0.95rem;

  display: flex;
  inline-size: var(--vel-mark);
  block-size: var(--vel-mark);
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line-strong);
  /* Круглая форма — единственная в списке: ряд знаков читается как путь по
     точкам и рифмуется с кружками полосы шагов в шапке. Значение из токена,
     произвольных радиусов в проекте нет. */
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-faint);
  transition:
    background-color 200ms ease,
    border-color 200ms ease,
    color 200ms ease;
}

.vel-step-row--done .vel-step-row__mark {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

/* Текущий шаг: рамка вдвое толще и мягкое кольцо — тот же приём, что у бегунка
   полосы мастера, чтобы «вы находитесь здесь» выглядело везде одинаково.
   Кольцо собрано из токена акцента, сырых значений нет. */
.vel-step-row--current .vel-step-row__mark {
  border-width: 2px;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-accent) 16%, transparent);
  color: var(--color-accent-deep);
}

.vel-step-row__title {
  min-inline-size: 0;
  /* Название забирает всю свободную ширину, поэтому знак состояния и ссылка
     «Vai» встают у правого края сами — без вспомогательного auto-поля. */
  flex: 1 1 auto;
  font-size: 0.9rem;
  line-height: 1.3;
  color: var(--color-muted);
}

.vel-step-row--done .vel-step-row__title {
  color: var(--color-fg);
}

.vel-step-row--current .vel-step-row__title {
  color: var(--color-accent-deep);
  font-weight: 600;
}

/* Галочка справа — это и есть «состояние» строки на эталоне. Цель нажатия ей
   не нужна: знак, а не действие, поэтому размер по содержимому. */
.vel-step-row__done {
  --vel-icon-size: 1.05rem;

  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.vel-step-row__go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  /* Цель нажатия: замер до правки давал 52×28. Поля добирают её до 44×44
     (WCAG 2.5.5), не трогая ни кегль, ни цвет. Высота ровно как у строки,
     поэтому отрицательных полей здесь нет: цель не вылезает за свою строку
     и не делит с соседним шагом полосу в несколько пикселей. */
  min-block-size: 2.75rem;
  min-inline-size: 2.75rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-control);
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.vel-step-row__go:hover {
  color: var(--color-accent-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Нажатие: у ссылки были покой, наведение и фокус — на тач-экране, где
   наведения нет, палец не получал ответа до самого перехода. */
.vel-step-row__go:active {
  color: var(--color-accent-deep);
  background-color: var(--color-raised);
}

@media (prefers-reduced-motion: reduce) {
  /* Глобальный сброс в main.css правит только длительность перехода — само
     правило остаётся вторым источником движения, снимаем его целиком. */
  .vel-step-row__mark,
  .vel-step-row__go {
    transition: none;
  }
}
</style>
