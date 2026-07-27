<script setup lang="ts">
/**
 * Знаки состояний кабинета. Линейные, толщина 2, углы острые — той же породы,
 * что VelPurposeIcon и VelCabinetNavIcon.
 *
 * ЗАЧЕМ. В оригинале на этих местах стоят эмодзи — 🛡️ ✅ ⏳. Эмодзи рисует
 * операционная система: своя палитра, свой вес, свой размер, и на кредитном
 * экране рядом с суммой они читаются как чужая наклейка. Нарисованный линией
 * знак наследует цвет через currentColor и живёт в той же геометрии, что всё
 * остальное.
 *
 * Декор: рядом с каждым знаком стоит текст, поэтому aria-hidden. Размер задаётся
 * пропом, а не классом снаружи: ширина живёт в scoped-стилях, и утилита
 * Tailwind боролась бы с ней за одну специфичность. Цвет снаружи задавать
 * можно — его здесь нет вовсе.
 */
interface Props {
  sign: 'shield' | 'shield-check' | 'clock' | 'lock' | 'bank' | 'card'
  size?: 'md' | 'lg'
}

withDefaults(defineProps<Props>(), { size: 'md' })
</script>

<template>
  <svg class="vel-sign" :class="`vel-sign--${size}`" viewBox="0 0 24 24" aria-hidden="true">
    <!-- Щит: полис защищает кредит -->
    <g v-if="sign === 'shield'">
      <path d="M12 3.5 19.5 6.2v5.6c0 4.1-3.1 7.3-7.5 8.7-4.4-1.4-7.5-4.6-7.5-8.7V6.2z" />
    </g>

    <!-- Щит с галочкой: полис выпущен -->
    <g v-else-if="sign === 'shield-check'">
      <path d="M12 3.5 19.5 6.2v5.6c0 4.1-3.1 7.3-7.5 8.7-4.4-1.4-7.5-4.6-7.5-8.7V6.2z" />
      <path d="M8.5 11.8 11 14.5l4.5-5" />
    </g>

    <!-- Часы: оценка времени ожидания -->
    <g v-else-if="sign === 'clock'">
      <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z" />
      <path d="M12 7.5V12l3.5 2.5" />
    </g>

    <!-- Замок: вывод пока закрыт -->
    <g v-else-if="sign === 'lock'">
      <path d="M5.5 10.5h13v10h-13z" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <path d="M12 14v3" />
    </g>

    <!-- Банк: фронтон и колонны, получение бонифико -->
    <g v-else-if="sign === 'bank'">
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M6.5 9.5v8M10 9.5v8M14 9.5v8M17.5 9.5v8" />
      <path d="M3.5 20.5h17" />
    </g>

    <!-- Карта: полоса магнитной дорожки и номер -->
    <g v-else>
      <path d="M3.5 5.5h17v13h-17z" />
      <path d="M3.5 9.5h17" />
      <path d="M6.5 14.5h4" />
    </g>
  </svg>
</template>

<style scoped>
.vel-sign {
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-sign--md {
  width: 1.375rem;
  height: 1.375rem;
}

.vel-sign--lg {
  width: 2rem;
  height: 2rem;
}
</style>
