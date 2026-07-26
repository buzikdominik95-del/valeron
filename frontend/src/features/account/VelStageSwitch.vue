<script setup lang="ts">
/**
 * Смена панелей кабинета (воронка, вкладки): out-in, лёгкий lift + fade,
 * 280ms. Высота не дёргается: при out-in старая панель уходит до появления
 * новой, и две одновременно на экране не стоят.
 *
 * ПРО ЗАВИСАНИЕ В СПРЯТАННОЙ ВКЛАДКЕ — проверено, трогать не нужно.
 *
 * При mode="out-in" новая панель входит только после ухода старой, а уход Vue
 * доводит до конца в следующем кадре (requestAnimationFrame). Пока вкладка
 * спрятана, кадров нет, и панель честно застревает с классом leave-from:
 * адрес и меню уже показывают другой раздел, а на экране висит прошлый.
 *
 * Чинить это НЕ НАДО, и вот почему: как только вкладка снова на экране, кадры
 * возобновляются, отложенный колбэк отрабатывает, и раздел доезжает сам за
 * ~300 мс. То есть застревание существует ровно в те моменты, когда на экран
 * никто не смотрит, и рассасывается к возвращению человека.
 *
 * Попытка обойти это через :css="false" СЛОМАЛА обычный случай: при mode
 * out-in leave завершался синхронно, и новая панель не появлялась вовсе
 * (замер: ни одного .vel-stage в разметке). Поэтому здесь остаётся штатный
 * CSS-переход — простое решение, которое работает у зрячего пользователя.
 */
defineProps<{
  /** Ключ фазы: при смене Vue перезапускает enter/leave. */
  stageKey: string
}>()
</script>

<template>
  <Transition name="vel-stage" mode="out-in">
    <div :key="stageKey" class="vel-stage">
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
.vel-stage {
  display: block;
  width: 100%;
}

.vel-stage-enter-active,
.vel-stage-leave-active {
  transition:
    opacity 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.vel-stage-enter-from {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.985);
  filter: blur(2px);
}

.vel-stage-leave-to {
  opacity: 0;
  transform: translateY(-0.4rem) scale(0.99);
  filter: blur(1px);
}

@media (prefers-reduced-motion: reduce) {
  .vel-stage-enter-active,
  .vel-stage-leave-active {
    transition: none;
  }

  .vel-stage-enter-from,
  .vel-stage-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
