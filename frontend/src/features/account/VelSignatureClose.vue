<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Крестик, закрывающий панель подписи.
 *
 * Вынесен отдельным файлом не ради переиспользования, а из-за объёма: у кнопки
 * своя зона нажатия, свои состояния и свой сброс движения — три десятка строк
 * стилей, к самой подписи отношения не имеющих.
 *
 * Эмит не объявлен намеренно. Корень компонента — нативная <button>, и @click
 * с родителя доезжает до неё сам, как до обычной кнопки. Объявленный эмит
 * снял бы слушатель с элемента и потребовал бы пробрасывать событие вручную —
 * лишний слой ради того же самого нажатия.
 *
 * Класс остался от блока vel-signature: кнопка позиционируется относительно
 * .vel-signature__panel и на экране остаётся его частью.
 */
const { t } = useI18n()
</script>

<template>
  <button type="button" class="vel-signature__close" :aria-label="t('account.signature.close')">
    <svg class="size-4" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 4 12 12M12 4 4 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="square"
      />
    </svg>
  </button>
</template>

<style scoped>
.vel-signature__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 44×44 по WCAG 2.5.8. Мимо этой кнопки палец попадает прямо в поле
     подписи и оставляет там штрих — цена промаха выше обычной. */
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-control);
  color: var(--color-muted);
  /* preflight Tailwind v4 оставляет кнопкам браузерное default. */
  cursor: pointer;
  transition: color 150ms, background-color 150ms;
}

.vel-signature__close:hover {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

/* На тач-экране :hover не наступает — отклик на касание нужен отдельно. */
.vel-signature__close:active {
  background-color: var(--color-track);
  color: var(--color-fg);
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: переход всё равно
     проигрался бы, просто мгновенно. Здесь снимаем его целиком. */
  .vel-signature__close {
    transition: none;
  }
}
</style>
