<script setup lang="ts">
import type { CreditPurpose } from '@/types/velora'

/**
 * Знак цели кредита. Линейный, толщина 2, углы острые — той же породы,
 * что логотип и иллюстрации. Цвет наследуется через currentColor.
 * Декор: рядом всегда есть текстовая подпись, поэтому aria-hidden.
 */
defineProps<{ purpose: CreditPurpose }>()
</script>

<template>
  <svg class="vel-purpose-icon" viewBox="0 0 24 24" aria-hidden="true">
    <!-- Авто: кузов и два колеса -->
    <g v-if="purpose === 'auto'">
      <path d="M3 14.5 4.6 9.5h14.8L21 14.5v4h-3v-2H6v2H3z" />
      <path d="M6.5 16.5h2M15.5 16.5h2" />
    </g>

    <!-- Личный кредит: кошелёк с застёжкой -->
    <g v-else-if="purpose === 'personal'">
      <path d="M3.5 7.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13z" />
      <path d="M3.5 7.5v12" />
      <path d="M14.5 12.5h5v3h-5z" />
    </g>

    <!-- Ремонт: молоток и уровень -->
    <g v-else-if="purpose === 'travaux'">
      <path d="M3 20.5 12 11.5" />
      <path d="M10 9.5 14 5.5l5 5-4 4z" />
      <path d="M16 3.5 20.5 8" />
    </g>

    <!-- Объединение долгов: два потока в один -->
    <g v-else-if="purpose === 'consolidamento'">
      <path d="M3.5 6.5h7l5 5.5-5 5.5h-7" />
      <path d="M13 12h7.5" />
      <path d="M17.5 8.5 21 12l-3.5 3.5" />
    </g>

    <!-- Другое: корзина -->
    <g v-else>
      <path d="M3.5 5.5h2.5l2.5 10h9l2.5-7H7" />
      <path d="M9.5 19.5h.01M17 19.5h.01" />
    </g>
  </svg>
</template>

<style scoped>
.vel-purpose-icon {
  width: 1.75rem;
  height: 1.75rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
</style>
