<script setup lang="ts">
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import { REVEAL_MOTION_OK } from '@/composables/useRevealStage'

/**
 * Конверт: линейная графика в духе остальных VelArt* — штрих 2, углы острые,
 * контур берёт currentColor, поэтому цвет задаёт вызывающая сторона ролью
 * текста. Внутри письма — мотив знака Velora: короткая опора вниз и длинный
 * восходящий штрих.
 *
 * Слои снизу вверх: задняя стенка → клапан → письмо → передний карман.
 * Это не косметика, а вся механика раскрытия:
 *   • карман нарисован последним и закрывает письмо, пока оно внутри;
 *   • клапан нарисован раньше письма и уходит ЗА него, когда отогнут, —
 *     ровно так, как это выглядит на бумаге;
 *   • вырез кармана и закрытый клапан совпадают вершина в вершину, поэтому
 *     закрытый конверт читается как сплошной прямоугольник со швом.
 *
 * Разметка описывает КОНЕЧНОЕ состояние: клапан отогнут, письмо снаружи.
 * В исходное их уводит .from(). Не отработал скрипт, запрещено движение —
 * конверт всё равно нарисован открытым, а не застыл на полпути. Тот же приём,
 * что у галочки в VelStepResult.
 */

/**
 * Линия сгиба клапана в координатах viewBox: верхний край стенки, y = 44.
 * Вокруг неё клапан переворачивается через scaleY: -1 → 1. Именно переворот,
 * а не поворот: плоскость svg двумерна, и разворот бумаги в ней честно
 * показывает только зеркальное отражение — на середине клапан виден с ребра,
 * как настоящий.
 */
const FLAP_FOLD = '80 44'

/**
 * На сколько письмо опущено внутрь конверта на старте. Ровно столько, чтобы
 * верх письма (y = 20) ушёл ниже вершины выреза (y = 76) и его не было видно
 * в прорези: 20 + 60 = 80. Меняешь координаты письма — пересчитай.
 */
const LETTER_TRAVEL = 60

/* Скромно и один раз: клапан отходит, письмо подхватывает движение чуть
   раньше, чем клапан замер. Вместе — около 740 мс. */
const FLAP_SECONDS = 0.42
const LETTER_SECONDS = 0.44
const OVERLAP_SECONDS = 0.12

const root = useGsapContext(() => {
  const element = root.value
  if (!element) return

  // Выборка от корня рисунка — та самая причина, по которой контексту
  // передаётся scopeElement: на странице конвертов может оказаться несколько,
  // и чужие части мы не трогаем.
  const flap = element.querySelector('.vel-envelope__flap')
  const letter = element.querySelector('.vel-envelope__letter')
  if (!flap || !letter) return

  /*
   * Штатный механизм GSAP вместо ручной проверки настройки: matchMedia сам
   * следит за условием и откатывает созданное внутри, когда условие ушло.
   * Ветки «не двигать» нет намеренно — без движения конверт уже открыт
   * разметкой, доводить в ней нечего. Сам matchMedia создан внутри
   * gsap.context и уедет вместе с ним по ctx.revert().
   */
  gsap.matchMedia().add(REVEAL_MOTION_OK, () => {
    gsap
      .timeline()
      .from(flap, {
        scaleY: -1,
        svgOrigin: FLAP_FOLD,
        duration: FLAP_SECONDS,
        ease: 'power2.out',
      })
      .from(
        letter,
        { y: LETTER_TRAVEL, duration: LETTER_SECONDS, ease: 'power2.out' },
        `-=${OVERLAP_SECONDS}`,
      )
  })
})
</script>

<template>
  <!-- Обёртка, а не svg в корне: ref у контекста GSAP типизирован как
       HTMLElement, и ширину рисунку задаёт снаружи класс на этом же узле. -->
  <div ref="root" class="vel-envelope">
    <svg class="vel-art" viewBox="0 0 160 132" aria-hidden="true" focusable="false">
      <rect class="vel-art__paper" x="20" y="44" width="120" height="80" />

      <path class="vel-art__paper vel-envelope__flap" d="M20 44 L80 12 L140 44" />

      <g class="vel-envelope__letter">
        <rect class="vel-art__letter" x="42" y="20" width="76" height="42" />
        <path class="vel-art__base" d="M52 34 L58 46" />
        <path class="vel-art__rise" d="M58 46 L72 28" />
        <path class="vel-art__grid" d="M80 36 L108 36" />
        <path class="vel-art__grid" d="M80 44 L102 44" />
      </g>

      <path class="vel-art__paper" d="M20 44 L80 76 L140 44 L140 124 L20 124 Z" />
    </svg>
  </div>
</template>

<style scoped>
.vel-envelope {
  display: block;
}

.vel-art {
  display: block;
  width: 100%;
  height: auto;
  fill: none;
  stroke-width: 2;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

/* Бумага конверта: заливка обязательна — ею письмо и скрыто внутри.
   Роль raised отделяет конверт от белой панели под ним. */
.vel-art__paper {
  fill: var(--color-raised);
  stroke: currentColor;
}

/* Письмо светлее конверта: лист, вынутый из него, а не его продолжение. */
.vel-art__letter {
  fill: var(--color-surface);
  stroke: currentColor;
}

.vel-art__grid {
  stroke: var(--color-line);
}

.vel-art__base {
  stroke: var(--color-accent-deep);
}

.vel-art__rise {
  stroke: var(--color-accent);
}

/* Отдельного правила для prefers-reduced-motion здесь нет намеренно:
   раскрытием заведует gsap.matchMedia в скрипте, и без разрешения на движение
   анимация просто не создаётся — гасить в стилях нечего. */
</style>
