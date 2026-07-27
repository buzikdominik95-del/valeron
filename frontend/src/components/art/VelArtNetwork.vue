<script setup lang="ts">
/**
 * Сеть банков-партнёров: узлы-квадраты и прямые связи между ними.
 *
 * Поверх кольца связей лежит мотив знака Velora — маршрут заявки: опорный
 * штрих идёт вниз к узлу-концентратору, восходящий уходит вверх-вправо
 * к цели и заканчивается выше точки старта. Цель — единственный залитый
 * акцентом узел, концентратор — тёмный: маршрут читается без подписей.
 *
 * Порядок рисования важен: связи ниже, маршрут поверх них, узлы последними,
 * чтобы линии не торчали из квадратов.
 */
</script>

<template>
  <svg class="vel-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path class="vel-art__link" d="M14 34 L26 72 L48 88 L102 84 L86 62 L64 26 Z" />
    <path class="vel-art__link" d="M86 62 L104 16" />
    <path class="vel-art__link" d="M26 72 L64 26" />

    <path class="vel-art__base" d="M14 34 L48 88" />
    <path class="vel-art__rise" d="M48 88 L104 16" />

    <rect class="vel-art__node" x="10" y="30" width="8" height="8" />
    <rect class="vel-art__node" x="22" y="68" width="8" height="8" />
    <rect class="vel-art__node" x="60" y="22" width="8" height="8" />
    <rect class="vel-art__node" x="82" y="58" width="8" height="8" />
    <rect class="vel-art__node" x="98" y="80" width="8" height="8" />

    <rect class="vel-art__hub" x="44" y="84" width="8" height="8" />
    <rect class="vel-art__target" x="100" y="12" width="8" height="8" />
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

.vel-art__link {
  stroke: var(--color-line);
}

.vel-art__node {
  stroke: currentColor;
}

.vel-art__hub {
  fill: var(--color-accent-deep);
}

.vel-art__target {
  fill: var(--color-accent);
}

.vel-art__base {
  stroke: var(--color-accent-deep);
}

.vel-art__rise {
  stroke: var(--color-accent);
}
</style>
