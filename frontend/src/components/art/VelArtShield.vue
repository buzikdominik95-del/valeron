<script setup lang="ts">
/**
 * Защита от отказов: щит, собранный из плоских геометрических форм.
 * Корпус — шестиугольник с острым носом, внутри вторая рамка (второй контур
 * защиты), по бокам насечки-слои, на верхних углах квадратные заклёпки.
 *
 * В центре — мотив знака Velora: короткий опорный штрих вниз и длинный
 * восходящий вверх, который заканчивается выше начала опоры. Тот же жест
 * читается и как галочка одобрения.
 *
 * Декор: aria-hidden. Цвета берутся из темы, поэтому смена гаммы перекрашивает
 * иллюстрацию без правок разметки.
 */
</script>

<template>
  <svg class="vel-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path class="vel-art__frame" d="M60 8 L106 24 L106 62 L60 112 L14 62 L14 24 Z" />
    <path class="vel-art__grid" d="M60 20 L96 32 L96 60 L60 100 L24 60 L24 32 Z" />

    <path class="vel-art__grid" d="M14 42 L24 42 M96 42 L106 42" />
    <path class="vel-art__grid" d="M14 52 L24 52 M96 52 L106 52" />

    <rect class="vel-art__bolt" x="11" y="21" width="6" height="6" />
    <rect class="vel-art__bolt" x="103" y="21" width="6" height="6" />

    <path class="vel-art__base" d="M38 46 L52 72" />
    <path class="vel-art__rise" d="M52 72 L86 32" />
  </svg>
</template>

<style scoped>
.vel-art {
  display: block;
  width: 100%;
  height: auto;
  fill: none;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-art__frame {
  stroke: currentColor;
}

.vel-art__grid {
  stroke: var(--color-line);
}

.vel-art__bolt {
  fill: var(--color-accent);
}

.vel-art__base {
  stroke: var(--color-accent-deep);
}

.vel-art__rise {
  stroke: var(--color-accent);
}
</style>
