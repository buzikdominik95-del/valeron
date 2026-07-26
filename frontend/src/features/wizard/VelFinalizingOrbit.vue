<script setup lang="ts">
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import { FINALIZING_MOTION_OK } from '@/features/wizard/finalizing'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Знак Velora внутри работающего механизма.
 *
 * Три концентрические дуги разного размера крутятся с разной скоростью и
 * в разные стороны: ближняя быстрее и в полную силу, дальняя медленнее
 * и бледнее. Один спиннер читается как «страница грузится»; несколько
 * несинхронных дуг — как «внутри что-то считается».
 *
 * Под знаком дышит мягкое пятно света. Это единственная деталь, которая
 * меняется не по кругу, а по амплитуде, — она и не даёт композиции
 * превратиться в равномерно вертящийся волчок.
 *
 * Блок целиком декоративный, поэтому aria-hidden на корне: VelLogo отдаёт
 * svg с role="img" и именем бренда, а «Velora» скринридер уже прочитал
 * в шапке мастера. Второй раз подряд то же слово — шум, а не сведения.
 * Словами про происходящее говорит живая область в VelStepFinalizing.
 */

/**
 * Половина цикла дыхания: вдох и выдох по секунде — полный период около
 * двух секунд, как просили. Спокойнее пульса в покое, поэтому свечение
 * читается как ровная работа, а не как тревога.
 */
const GLOW_HALF_BREATH_S = 1

/** Насколько свет угасает и поджимается в нижней точке дыхания. */
const GLOW_DIM = 0.42
const GLOW_SHRINK = 0.84

const root = useGsapContext(() => {
  // Выборка от корня блока — та самая причина, по которой контексту передаётся
  // scopeElement: на экране может оказаться не один такой знак, и чужой свет
  // мы не трогаем.
  const glow = root.value?.querySelector<HTMLElement>('.vel-orbit__glow')
  if (!glow) return

  /*
   * Дыхание — GSAP, потому что это единственная анимация блока с амплитудой:
   * её параметры хочется держать рядом с остальным движением шага, а не
   * в отдельных @keyframes, куда никто не заглянет.
   *
   * Уборка не нужна: matchMedia создан внутри gsap.context (см.
   * useGsapContext) и уедет вместе с ним по ctx.revert(). При включённом
   * «уменьшить движение» внутрь никто не заходит — свет просто стоит
   * в своём исходном, самом ярком состоянии.
   */
  gsap.matchMedia().add(FINALIZING_MOTION_OK, () => {
    gsap.to(glow, {
      opacity: GLOW_DIM,
      scale: GLOW_SHRINK,
      duration: GLOW_HALF_BREATH_S,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  })
})
</script>

<template>
  <span ref="root" class="vel-orbit" aria-hidden="true">
    <!-- Свет лежит первым: он фон для всего остального в той же ячейке сетки. -->
    <span class="vel-orbit__glow"></span>

    <span class="vel-orbit__arc vel-orbit__arc--far"></span>
    <span class="vel-orbit__arc vel-orbit__arc--mid"></span>
    <span class="vel-orbit__arc vel-orbit__arc--near"></span>

    <VelLogo mark-only large />
  </span>
</template>

<style scoped>
/* Свет, дуги и знак лежат в одной ячейке сетки — без абсолютного
   позиционирования, приём тот же, что в VelProgressRing. */
.vel-orbit {
  display: inline-grid;
  place-items: center;
  inline-size: 8rem;
  block-size: 8rem;
}

.vel-orbit > * {
  grid-area: 1 / 1;
}

/*
  Свечение — радиальный градиент из токена акцента. closest-side вписывает
  круг в квадрат элемента, поэтому обрезка и скругление здесь не нужны:
  свет гаснет сам, а не упирается в край.
*/
.vel-orbit__glow {
  inline-size: 100%;
  block-size: 100%;
  background-image: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--color-accent) 26%, transparent),
    transparent
  );
}

/*
  ВРАЩЕНИЕ ОСТАВЛЕНО НА CSS ОСОЗНАННО. Это бесконечный цикл без состояния:
  никто не спрашивает у него прогресс, никто не переключает его по событию,
  и синхронизировать его не с чем. Три таких дуги на GSAP означали бы три
  живых твина, которые тикают на главном потоке всё время, пока экран висит,
  ради результата, который композитор выдаёт даром одним transform.
  На GSAP здесь только дыхание света — у него есть амплитуда, и его параметры
  стоит держать в скрипте рядом с остальным движением шага.

  Дуга собирается цветом сторон рамки, а не рисуется в svg: круглая рамка
  с одной-двумя окрашенными сторонами и есть дуга. Вращается сам элемент.
*/
.vel-orbit__arc {
  border-style: solid;
  border-color: transparent;
  /* Круглое здесь по сути формы, а не по вкусу; значение из токена,
     произвольных радиусов в проекте нет. */
  border-radius: var(--radius-round);
  animation-name: vel-orbit-spin;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

/* Ближняя: полусфера из двух смежных сторон, полная сила, самая быстрая. */
.vel-orbit__arc--near {
  inline-size: 58%;
  block-size: 58%;
  border-width: 2px;
  border-block-start-color: var(--color-accent);
  border-inline-end-color: var(--color-accent);
  animation-duration: 1500ms;
}

/* Средняя: четверть дуги, вполсилы, вдвое медленнее и НАВСТРЕЧУ ближней. */
.vel-orbit__arc--mid {
  inline-size: 79%;
  block-size: 79%;
  border-width: 2px;
  border-inline-start-color: var(--color-accent-deep);
  opacity: 0.55;
  animation-duration: 2600ms;
  animation-direction: reverse;
}

/* Дальняя: тонкая, почти прозрачная, самая медленная. */
.vel-orbit__arc--far {
  inline-size: 100%;
  block-size: 100%;
  border-width: 1px;
  border-block-start-color: var(--color-accent);
  border-block-end-color: var(--color-accent);
  opacity: 0.3;
  animation-duration: 4200ms;
}

@keyframes vel-orbit-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Гасим анимацию явно, а не полагаемся на сброс из main.css: тот правит
    только длительность и число итераций, то есть дуги домотали бы круг
    за 0.01ms и замерли. Тут это выглядело бы приемлемо (360° = 0°), но
    правило «сброс главное сделает» не выдерживает первой же правки —
    достаточно дать дуге иной конечный кадр, и она застрянет в нём.

    Само дыхание света выключать не нужно: при 'reduce' gsap.matchMedia
    внутрь условия не заходит и твина не создаёт вовсе.

    Переход на следующий шаг это не трогает: его ведёт useTimeoutFn.
  */
  .vel-orbit__arc {
    animation: none;
  }
}
</style>
