<script setup lang="ts">
import { computed } from 'vue'

/**
 * Индикатор шагов: ряд одинаковых сегментов, слева заполненные.
 *
 * Это индикатор, а не навигация: сегменты ничего не открывают, поэтому они
 * не кнопки и не ссылки. Роль progressbar — листовая, вложенные span-ы
 * скринридер в ней не читает, и значение целиком передают aria-value*.
 *
 * Доступное имя обязательно: progressbar без имени объявляется безымянным
 * индикатором. Строку компонент себе не выдумывает — её передаёт вызывающая
 * сторона уже переведённой через t(). Приём тот же, что в VelProgressRing.
 */
interface Props {
  /** Доступное имя индикатора. Не называть ariaLabel — Vue примет это за нативный атрибут. */
  label: string
  /** Сколько всего шагов. */
  total: number
  /** Сколько уже пройдено: current сегментов слева заполнены. */
  current: number
}

const props = defineProps<Props>()

/* Значения приходят снаружи и могут быть какими угодно. Дробное или
   отрицательное total дало бы Array.from с длиной NaN, то есть пустой ряд
   вместо индикатора. */
const total = computed(() =>
  Number.isFinite(props.total) && props.total >= 1 ? Math.floor(props.total) : 1,
)

const current = computed(() => {
  const raw = Number.isFinite(props.current) ? Math.floor(props.current) : 0
  return Math.min(total.value, Math.max(0, raw))
})

/** Ряд флагов «сегмент заполнен» — из него же берётся и длина ряда. */
const segments = computed(() =>
  Array.from({ length: total.value }, (_, index) => index < current.value),
)
</script>

<template>
  <div
    class="flex items-center gap-2"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="total"
    :aria-valuenow="current"
  >
    <!-- Ключом идёт индекс: ряд задаётся только длиной, переставлять
         и отслеживать в нём нечего. -->
    <span
      v-for="(filled, index) in segments"
      :key="index"
      class="vel-seg rounded-control"
      :class="{ 'vel-seg--on': filled }"
    ></span>
  </div>
</template>

<style scoped>
.vel-seg {
  inline-size: 2.5rem;
  block-size: 0.375rem;
  /*
    Пустой сегмент обязан читаться на светлой бумаге: одной заливки raised для
    этого мало — к фону страницы у неё около 1.1:1. Границу даёт кольцо цветом
    рамок контролов, 3.33:1, выше порога 3:1 по критерию 1.4.11.

    Кольцо внутренней тенью, а не border: геометрия сегментов не должна
    зависеть от состояния, иначе заполненный и пустой разъедутся на пиксель.
  */
  background-color: var(--color-raised);
  box-shadow: inset 0 0 0 1px var(--color-line-strong);
}

.vel-seg--on {
  background-color: var(--color-accent);
  box-shadow: none;
}

/* Переходов здесь нет намеренно: экран показывает своё положение сразу
   и по ходу жизни не меняет его — анимировать нечего. */
</style>
