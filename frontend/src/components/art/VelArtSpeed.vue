<script setup lang="ts">
/**
 * Скорость решения: траектория, уходящая вверх.
 *
 * Мотив знака Velora взят целиком: опорный штрих падает вниз-вправо,
 * восходящий выстреливает вверх и заканчивается выше начала опоры,
 * завершаясь острым шевроном-остриём. Рядом с ним — пологая серая линия
 * обычного сценария: контраст углов и есть «быстрее».
 *
 * Внизу шкала времени с насечками, слева — штрихи скорости.
 * Всё декоративное, поэтому aria-hidden.
 */
</script>

<template>
  <svg class="vel-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path class="vel-art__grid" d="M8 104 L112 104" />
    <path class="vel-art__grid" d="M28 104 L28 98 M52 104 L52 98 M76 104 L76 98 M100 104 L100 98" />

    <path class="vel-art__grid" d="M44 92 L110 58" />

    <path class="vel-art__grid" d="M10 12 L36 12 M10 22 L28 22 M10 32 L22 32" />

    <path class="vel-art__base" d="M16 40 L44 92" />
    <path class="vel-art__rise" d="M44 92 L100 20" />
    <path class="vel-art__rise" d="M83 26 L100 20 L98 38" />
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

.vel-art__grid {
  stroke: var(--color-line);
}

.vel-art__base {
  stroke: var(--color-accent-deep);
}

.vel-art__rise {
  stroke: var(--color-accent);
}
</style>
