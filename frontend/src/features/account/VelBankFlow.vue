<script setup lang="ts">
import VelAccountSign from '@/features/account/VelAccountSign.vue'

/**
 * Схема «банк → Velora → счёт»: декоративная, без выдуманных процентов
 * и без таймера «7 минут». Состояние уже сказано текстом и progressbar
 * без valuеnow; SVG только иллюстрирует, что заявка в работе у банка.
 *
 * aria-hidden лежит на корне схемы и снимать его нельзя: экран банковской
 * авторизации уже объявляет своё состояние текстом статуса и индикатором,
 * и озвученная схема стала бы третьим пересказом одного ожидания подряд.
 *
 * Точки бегут по трубам с постоянной скоростью и с постоянным сдвигом второй
 * относительно первой. Скорость намеренно ни с чем не связана: привяжи её
 * к чему-нибудь — и схема начала бы отвечать за оценку, которой у фронта нет.
 *
 * Отдельным компонентом, а не куском разметки в VelBankAuthorizing.vue: у схемы
 * своя геометрия узлов, своя анимация и свой сброс для reduced-motion, и рядом
 * с реквизитами перевода всему этому делать нечего. Классы остались от блока
 * `vel-bank` — схема живёт только внутри него и собственным блоком не является.
 */
</script>

<template>
  <div class="vel-bank__flow" aria-hidden="true">
    <span class="vel-bank__node">
      <VelAccountSign sign="bank" />
    </span>
    <span class="vel-bank__pipe">
      <span class="vel-bank__dot"></span>
    </span>
    <span class="vel-bank__node vel-bank__node--brand">V</span>
    <span class="vel-bank__pipe">
      <span class="vel-bank__dot vel-bank__dot--late"></span>
    </span>
    <span class="vel-bank__node">
      <VelAccountSign sign="card" />
    </span>
  </div>
</template>

<style scoped>
.vel-bank__flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.75rem 0.5rem;
}

.vel-bank__node {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-round);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
  font-size: 0.95rem;
  font-weight: 700;
}

.vel-bank__node--brand {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.vel-bank__pipe {
  position: relative;
  flex: 1 1 auto;
  height: 2px;
  overflow: hidden;
  background-color: var(--color-track);
}

.vel-bank__dot {
  position: absolute;
  inset-block: -3px;
  inline-size: 0.5rem;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
  animation: vel-bank-dot 1.8s ease-in-out infinite;
}

.vel-bank__dot--late {
  animation-delay: 0.45s;
}

@keyframes vel-bank-dot {
  from {
    left: -0.5rem;
    opacity: 0.35;
  }

  40% {
    opacity: 1;
  }

  to {
    left: calc(100% + 0.25rem);
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Тот же довод, что у бегущего отрезка полосы в VelBankAuthorizing.vue: сброс
    из main.css сжимает длительность до мгновения, и точка не исчезла бы,
    а замерла кляксой в начале трубы — с виду мусор, а не остановленный ход.
    Убираем сами точки: узлы и трубы остаются и продолжают показывать путь
    денег, а о продолжающемся ожидании говорит текст статуса соседнего экрана.
  */
  .vel-bank__dot {
    display: none;
  }
}
</style>
