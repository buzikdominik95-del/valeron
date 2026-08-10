<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Промежуточное состояние карточки: снимки отправлены, ответ ещё не пришёл.
 *
 * ЗАЧЕМ ОНО ВООБЩЕ ЕСТЬ. Без него нажатие на «Carica il documento» давало бы
 * зелёную галочку тем же кадром, а мгновенная проверка читается как «ничего не
 * проверяли, кнопка просто перекрасила карточку». Пауза с пульсирующими
 * точками и одной поясняющей строкой говорит ровно то, что происходит на самом
 * деле: идёт ожидание.
 *
 * Отдельным файлом — не ради переиспользования, а ради размера карточки:
 * вместе с ним VelDocumentUpload перевалил за предел в 300 строк.
 */
const { t } = useI18n()
</script>

<template>
  <div class="vel-docwait">
    <span class="vel-docwait__dots" aria-hidden="true">
      <span class="vel-docwait__dot"></span>
      <span class="vel-docwait__dot"></span>
      <span class="vel-docwait__dot"></span>
    </span>
    <p class="vel-docwait__text">{{ t('account.docs.checkingHint') }}</p>
    <div class="vel-docwait__bar" role="progressbar" aria-label="verifica in corso">
      <span class="vel-docwait__bar-fill"></span>
    </div>
  </div>
</template>

<style scoped>
.vel-docwait {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding-block: 1.5rem;
  text-align: center;
}

.vel-docwait__dots {
  display: inline-flex;
  gap: 0.4rem;
}

/*
  Пульсирующие точки. Круглая форма здесь по прямой просьбе владельца продукта, радиус
  берём из токена --radius-round, чтобы «круглое» не расползалось по файлам
  произвольными числами. Задержки разнесены по позиции, а не инлайн-стилем:
  динамики в шаблонах у нас нет, а трём соседям хватает :nth-child.
*/
.vel-docwait__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
  animation: vel-docwait-pulse 1.1s ease-in-out infinite;
}

.vel-docwait__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.vel-docwait__dot:nth-child(3) {
  animation-delay: 0.3s;
}

.vel-docwait__text {
  max-inline-size: 24rem;
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.45;
}

.vel-docwait__bar {
  inline-size: min(100%, 20rem);
  block-size: 0.375rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 14%, var(--color-raised));
  overflow: hidden;
}

.vel-docwait__bar-fill {
  display: block;
  block-size: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    color-mix(in oklab, var(--color-accent) 55%, white)
  );
  animation: vel-docwait-bar 22s cubic-bezier(0.15, 0.6, 0.3, 1) forwards;
  transform-origin: left center;
}

@keyframes vel-docwait-bar {
  0% {
    transform: scaleX(0.03);
  }

  18% {
    transform: scaleX(0.42);
  }

  45% {
    transform: scaleX(0.68);
  }

  75% {
    transform: scaleX(0.86);
  }

  100% {
    transform: scaleX(0.96);
  }
}

@keyframes vel-docwait-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.75);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность и число повторов — точки всё
     равно мигали бы одним кадром. Гасим движение и оставляем их видимыми:
     строка «идёт проверка» рядом объясняет ожидание и без пульсации. */
  .vel-docwait__dot {
    opacity: 1;
    animation: none;
    transform: none;
  }

  .vel-docwait__bar-fill {
    animation: none;
    transform: scaleX(0.6);
  }
}
</style>
