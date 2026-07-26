<script setup lang="ts">
/**
 * Короткое сообщение поверх кабинета: «documenti pronti», «contratto firmato»,
 * «IBAN inserito».
 *
 * Отдельным файлом от VelAccountFlow: там маршрут кабинета и связи между
 * панелями, а здесь одна полоска с собственной раскладкой и собственным
 * разбором нижней панели. Текстом и сроком жизни распоряжается вызывающая
 * сторона — сообщение приходит пропом, и решать, что и когда показать,
 * полоска не должна.
 *
 * role="status" с aria-live="polite" обязателен: сообщение появляется без
 * действия пользователя и иначе прошло бы мимо скринридера. pointer-events:
 * none — под полоской остаются нажимаемыми кнопки, которые она перекрыла.
 */
defineProps<{
  /** null — показывать нечего, узла в дереве нет вовсе. */
  text: string | null
}>()
</script>

<template>
  <p
    v-if="text"
    class="vel-toast"
    role="status"
    aria-live="polite"
    data-testid="ui-toast"
  >
    {{ text }}
  </p>
</template>

<style scoped>
.vel-toast {
  position: fixed;
  inset-inline: 1rem;
  /*
    ЗАПАСНОЕ ЗНАЧЕНИЕ ЗДЕСЬ — РАБОЧЕЕ, А НЕ ЗАПАСНОЕ. Тост — сосед .vel-cabinet
    (оба лежат прямо в #app), а --vel-tabbar-h объявлена НА .vel-cabinet, и вниз
    по дереву к соседу она не наследуется: замерено, на #app переменная пуста и
    в calc уходит именно запасное число. Было 4.5rem против настоящих 4rem —
    расхождение ни к чему не приводило по счастливой случайности. Держим оба
    числа равными тем, что объявлены в оболочке, чтобы тост не наехал на
    нижнюю панель, если их однажды поменяют.
  */
  bottom:
    calc(
      var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.5rem) * 2 +
        env(safe-area-inset-bottom) + 0.5rem
    );
  z-index: 80;
  margin: 0 auto;
  max-inline-size: 22rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 8px 24px color-mix(in oklab, var(--color-accent-deep) 28%, transparent);
  pointer-events: none;
}

@media (min-width: 64rem) {
  .vel-toast {
    bottom: 1.5rem;
    inset-inline-end: 1.5rem;
    inset-inline-start: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-toast {
    transition: none;
  }
}
</style>
