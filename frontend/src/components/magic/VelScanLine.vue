<script setup lang="ts">
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'

/**
 * Полоса НЕОПРЕДЕЛЁННОГО прогресса: отрезок ездит по дорожке из конца в конец.
 *
 * Она намеренно не имитирует проценты. Сколько идёт проверка одного банка,
 * заранее не знает никто — ни фронт, ни бэкенд, — и рисованная шкала, доехавшая
 * до 80% за придуманное время, обещает то, чего никто не обещал. Здесь честное
 * «работа идёт»: у движения нет ни начала отсчёта, ни конца.
 *
 * Позиционирует компонент ВЫЗЫВАЮЩИЙ: собственного position у корня нет, чтобы
 * родитель мог положить полосу absolute внутрь своей строки, не воюя за
 * специфичность. Отрезок обрезается корнем (overflow: hidden), поэтому за
 * границы отведённой дорожки он не выезжает ни на пиксель.
 */

/** Полный проезд отрезка от края до края. */
const SWEEP_S = 1.1

/** Доля проезда на разгон. Остаток — уход за правый край. */
const SWEEP_IN_PART = 0.55

/**
 * Отрезок занимает 38% дорожки, значит уйти за правый край ему нужно на
 * 100/38 ≈ 263% СВОЕЙ ширины. Берём с запасом: масштаб по X живёт своей
 * жизнью, и хвост обязан исчезнуть при любом его значении.
 */
const EXIT_PERCENT = 280

/** Отрезок растягивается на разгоне и поджимается на выходе. */
const SEGMENT_REST = 0.7
const SEGMENT_STRETCH = 1.3

const root = useGsapContext(() => {
  const segment = root.value?.querySelector<HTMLElement>('.vel-scan__segment')
  if (!segment) return

  /*
   * Уборка не нужна: таймлайн создан внутри gsap.context (см. useGsapContext)
   * и уедет вместе с ним по ctx.revert(). При включённом «уменьшить движение»
   * внутрь условия никто не заходит — полоса остаётся ровной подсветкой
   * во всю дорожку (см. @media в стилях), состояние видно, движения нет.
   */
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap
      .timeline({ repeat: -1 })
      .fromTo(
        segment,
        { xPercent: -100, scaleX: SEGMENT_REST },
        {
          xPercent: 55,
          scaleX: SEGMENT_STRETCH,
          duration: SWEEP_S * SWEEP_IN_PART,
          ease: 'power2.out',
        },
      )
      /*
       * Разгон и уход разными ease: отрезок выезжает из-за края уже на ходу
       * и уходит ускоряясь. С линейным движением он на каждом обороте
       * замирал бы у края на кадр — и полоса читалась бы как заевшая.
       */
      .to(segment, {
        xPercent: EXIT_PERCENT,
        scaleX: SEGMENT_REST,
        duration: SWEEP_S * (1 - SWEEP_IN_PART),
        ease: 'power2.in',
      })
  })
})
</script>

<template>
  <span ref="root" class="vel-scan" aria-hidden="true">
    <span class="vel-scan__segment"></span>
  </span>
</template>

<style scoped>
/*
  Размеров по горизонтали корень себе не назначает: когда родитель кладёт
  полосу absolute с двумя inset, ширину считают именно они. Своё inline-size
  здесь перебило бы этот расчёт и полоса вылезла бы за правый край.
*/
.vel-scan {
  display: block;
  block-size: 2px;
  overflow: hidden;
  background-color: var(--color-track);
  pointer-events: none;
}

/*
  Ширина отрезка — статическая раскладка, а не анимация: двигают его только
  transform (xPercent) и scaleX, то есть композитор. Анимация самой ширины
  пересчитывала бы раскладку каждый кадр.
*/
.vel-scan__segment {
  display: block;
  block-size: 100%;
  inline-size: 38%;
  background-color: var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
  /* Бегущий отрезок заменяем ровной подсветкой: состояние видно, движения нет.
     Полагаться на глобальный сброс в main.css нельзя — он правит CSS-анимации,
     а здесь их нет вовсе, движение ведёт GSAP. */
  .vel-scan__segment {
    inline-size: 100%;
  }
}
</style>
