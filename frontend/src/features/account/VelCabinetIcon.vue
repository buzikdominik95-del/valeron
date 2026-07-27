<script setup lang="ts">
import type { CabinetTab } from '@/composables/useCabinetTab'

/**
 * Знаки оболочки кабинета: четыре раздела меню плюс колокольчик уведомлений
 * в шапке.
 *
 * Отдельный файл от VelAccountIcon намеренно. Там знаки ПУТИ ЗАЯВКИ (пять
 * шагов, галочка, часы) — их набор задаёт тип AccountStep и меняется вместе
 * с маршрутом. Здесь знаки НАВИГАЦИИ, их набор задаёт CabinetTab. Свалив их
 * в один компонент, мы получили бы объединение двух несвязанных перечислений,
 * где 'documents' значит сразу и шаг заявки, и раздел кабинета, — и рисунок
 * у них разный: у шага лист со стрелкой загрузки, у раздела лист с карандашом.
 *
 * Порода та же, что у остальных рисунков Velora: линия, толщина 2, без заливок.
 * Размер задаёт вызывающий через --vel-icon-size на любом родителе.
 *
 * Декор: рядом с каждым знаком стоит подпись, поэтому aria-hidden.
 */
defineProps<{ kind: CabinetTab | 'bell' }>()
</script>

<template>
  <svg class="vel-cabinet-icon" viewBox="0 0 24 24" aria-hidden="true">
    <!-- Home: сетка 2×2, левая верхняя и правая нижняя клетки крупнее -->
    <g v-if="kind === 'home'">
      <rect x="3.5" y="3.5" width="8" height="8" rx="1.5" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1.5" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1.5" />
      <rect x="12.5" y="12.5" width="8" height="8" rx="1.5" />
    </g>

    <!-- Profilo: голова и плечи -->
    <g v-else-if="kind === 'profile'">
      <path d="M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
      <path d="M5 20v-1c0-2.2 3.1-3.5 7-3.5s7 1.3 7 3.5v1" />
    </g>

    <!-- Documenti: лист с загнутым углом и карандаш поверх -->
    <g v-else-if="kind === 'documents'">
      <path d="M18.5 11V8.5l-5-5H6v17h6" />
      <path d="M13.5 3.5v5h5" />
      <path d="M20.5 13.5 15 19v2.5h2.5L23 16z" />
    </g>

    <!-- Assistenza: два наложенных пузырька диалога -->
    <g v-else-if="kind === 'support'">
      <path d="M3.5 5.5h12v8h-7l-5 3.5z" />
      <path d="M8.5 16.5v1h6l4 2.5v-3.5h2v-7h-2" />
    </g>

    <!-- Уведомления: колокольчик -->
    <g v-else>
      <path d="M6 17.5v-6a6 6 0 0 1 12 0v6" />
      <path d="M4 17.5h16" />
      <path d="M10 20.5h4" />
    </g>
  </svg>
</template>

<style scoped>
.vel-cabinet-icon {
  /* Запасное значение: знак не обязан знать, кто его вставил */
  width: var(--vel-icon-size, 1.25rem);
  height: var(--vel-icon-size, 1.25rem);
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
</style>
