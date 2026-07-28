<script setup lang="ts">
import type { AccountStep } from '@/stores/account.store'

/**
 * Знаки кабинета: пять шагов заявки плюс два состояния — «сделано» и
 * «в обработке». Линия, толщина 2, углы острые — той же породы, что
 * VelPurposeIcon, логотип и остальные рисунки Velora.
 *
 * Знаки заменяют эмодзи оригинала (🛡️ ✅ ⏳): эмодзи рисует шрифт системы,
 * его нельзя ни покрасить ролью, ни выровнять по штриху остальных значков.
 *
 * Размер задаёт вызывающий через --vel-icon-size на любом родителе:
 * инлайн-стилей в шаблонах нет, а прописать размер пропом значило бы держать
 * в скрипте таблицу из трёх чисел, которые всё равно живут в CSS блока.
 *
 * Декор: рядом с каждым знаком есть текст, поэтому aria-hidden.
 */
defineProps<{ kind: AccountStep | 'check' | 'clock' }>()
</script>

<template>
  <svg class="vel-account-icon" viewBox="0 0 24 24" aria-hidden="true">
    <!-- Сделано: галочка -->
    <path v-if="kind === 'check'" d="M4.5 12.5 9.5 17.5 19.5 6.5" />

    <!-- В обработке: циферблат + анимированные стрелки -->
    <g v-else-if="kind === 'clock'" class="vel-account-icon__clock">
      <circle cx="12" cy="12" r="7.5" />
      <g class="vel-account-icon__hour">
        <path d="M12 12 V8" />
      </g>
      <g class="vel-account-icon__minute">
        <path d="M12 12 V5.5" />
      </g>
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </g>

    <!-- Расчёт: столбцы диаграммы -->
    <g v-else-if="kind === 'simulation'">
      <path d="M3.5 20.5h17" />
      <path d="M6.5 20.5V13M12 20.5V6.5M17.5 20.5v-5" />
    </g>

    <!-- Одобрение: щит с галочкой -->
    <g v-else-if="kind === 'approval'">
      <path d="M12 3.5 19.5 6v5.5c0 4.2-3.2 7.2-7.5 9-4.3-1.8-7.5-4.8-7.5-9V6z" />
      <path d="M8.5 11.5 11 14l4.5-4.5" />
    </g>

    <!-- Аккаунт: человек -->
    <g v-else-if="kind === 'account'">
      <path d="M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
      <path d="M5 20v-1c0-2.2 3.1-3.5 7-3.5s7 1.3 7 3.5v1" />
    </g>

    <!--
      Документы: стрелка вверх из подставки. Шаг называется «загрузите
      документы», а лист с загнутым углом говорил «посмотрите документ» —
      действие человека читалось из него только по маленькой стрелке внутри.
      Вторая причина — размер: в полосе шагов знак рисуется пятнадцатью
      пикселями, и лист, уголок и стрелка в трёх фигурах слипались в кляксу.
    -->
    <g v-else-if="kind === 'documents'">
      <path d="M12 14V4.5M8 8.5 12 4.5l4 4" />
      <path d="M4.5 15.5v4h15v-4" />
    </g>

    <!-- Подпись: перо над строкой -->
    <g v-else>
      <path d="M5 20.5h14" />
      <path d="M6.5 17.5 5.5 18.5V15L15 5.5 18.5 9 9 18.5H6.5z" />
      <path d="M13 7.5 16.5 11" />
    </g>
  </svg>
</template>

<style scoped>
.vel-account-icon {
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

.vel-account-icon__hour,
.vel-account-icon__minute {
  transform-origin: 12px 12px;
  transform-box: view-box;
}

.vel-account-icon__hour {
  animation: vel-account-icon-hour 48s linear infinite;
}

.vel-account-icon__minute {
  animation: vel-account-icon-minute 4s linear infinite;
}

@keyframes vel-account-icon-hour {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vel-account-icon-minute {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-account-icon__hour,
  .vel-account-icon__minute {
    animation: none;
  }
}
</style>
