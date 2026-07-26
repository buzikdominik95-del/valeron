<script setup lang="ts">
import { gsap } from 'gsap'
import { useI18n } from 'vue-i18n'
import { useGsapContext } from '@/composables/useGsapContext'

/**
 * Итог проверки документа: крупный знак успеха, заголовок и две короткие
 * строки.
 *
 * ЗНАК СОБИРАЕТСЯ НА ГЛАЗАХ, а не проявляется. Порядок кадров отвечает порядку
 * смысла: сначала окружность обходит знак по контуру — «проверка прошла круг», —
 * следом внутрь ложится галочка, и заливка догоняет контур последней. Тремя
 * отдельными твинами такую очередь не удержать: моменты держались бы лишь тем,
 * что длительности случайно сходятся, и правка любой тихо развалила бы жест.
 * Поэтому один таймлайн с явными позициями от нуля.
 *
 * ДЛИНА ШТРИХА СПРАШИВАЕТСЯ У САМОГО ПУТИ (getTotalLength), а не вписана
 * числом: подправят радиус окружности или наклон галочки — прорисовка
 * подстроится сама, а вписанное число дало бы либо недочерченный знак, либо
 * паузу перед началом.
 *
 * РАЗМЕТКА ОПИСЫВАЕТ КОНЕЧНОЕ СОСТОЯНИЕ: контур целый, галочка на месте,
 * заливка внутри. Пунктир ставит GSAP и только внутри условия «двигать можно».
 * Не отработал скрипт, стоит prefers-reduced-motion — знак просто нарисован
 * целиком, а не застыл на полпути. Тот же приём, что у конверта VelArtEnvelope.
 */

/** Условие для gsap.matchMedia: механизм сам следит за настройкой и откатывает
    созданное внутри, когда пользователь просит не двигать интерфейс. */
const MOTION_OK = '(prefers-reduced-motion: no-preference)'

/** Центр знака в координатах viewBox — точка роста заливки. */
const DISC_ORIGIN = '48 48'

/* Весь жест укладывается примерно в секунду: это итог, а не представление. */
const RING_S = 0.62
const DISC_AT_S = 0.24
const DISC_S = 0.62
const TICK_AT_S = 0.5
const TICK_S = 0.34
const COPY_AT_S = 0.62
const COPY_S = 0.38
const COPY_STAGGER_S = 0.07
const COPY_RISE = 10

const { t } = useI18n()

const root = useGsapContext(() => {
  const element = root.value
  if (!element) return

  /* Выборка от корня знака — та самая причина, по которой контексту передаётся
     scopeElement: чужие галочки на странице мы не трогаем. */
  const ring = element.querySelector<SVGCircleElement>('.vel-docdone__ring')
  const disc = element.querySelector<SVGCircleElement>('.vel-docdone__disc')
  const tick = element.querySelector<SVGPathElement>('.vel-docdone__tick')
  const copy = element.querySelectorAll('.vel-docdone__copy > *')
  if (!ring || !disc || !tick) return

  gsap.matchMedia().add(MOTION_OK, () => {
    const ringLength = ring.getTotalLength()
    const tickLength = tick.getTotalLength()

    gsap.set(ring, { strokeDasharray: ringLength })
    gsap.set(tick, { strokeDasharray: tickLength })

    gsap
      .timeline()
      // Контур обходит знак: dasharray + dashoffset, то есть штрих, а не opacity.
      .fromTo(
        ring,
        { strokeDashoffset: ringLength },
        { strokeDashoffset: 0, duration: RING_S, ease: 'power2.inOut' },
        0,
      )
      /* Заливка догоняет контур: растёт из центра и приходит к краю чуть позже,
         чем контур замкнётся. svgOrigin обязателен — у svg-фигуры собственного
         центра для transform нет, и без него круг уехал бы из середины. */
      .fromTo(
        disc,
        { scale: 0, svgOrigin: DISC_ORIGIN },
        { scale: 1, duration: DISC_S, ease: 'power2.out' },
        DISC_AT_S,
      )
      // Галочка идёт по уже очерченному кругу — тем же штрихом.
      .fromTo(
        tick,
        { strokeDashoffset: tickLength },
        { strokeDashoffset: 0, duration: TICK_S, ease: 'power2.out' },
        TICK_AT_S,
      )
      // Текст подхватывает движение знака, а не появляется отдельным событием.
      .from(
        copy,
        {
          opacity: 0,
          y: COPY_RISE,
          duration: COPY_S,
          ease: 'power2.out',
          stagger: COPY_STAGGER_S,
        },
        COPY_AT_S,
      )
  })
})
</script>

<template>
  <div ref="root" class="vel-docdone">
    <!-- Декор: всё, что знак означает, сказано словами под ним. -->
    <svg class="vel-docdone__sign" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <circle class="vel-docdone__disc" cx="48" cy="48" r="40" />
      <circle class="vel-docdone__ring" cx="48" cy="48" r="40" />
      <path class="vel-docdone__tick" d="M31 49.5 42.5 61 65 34" />
    </svg>

    <div class="vel-docdone__copy">
      <h3 class="vel-docdone__title">{{ t('account.docs.done.title') }}</h3>
      <p class="vel-docdone__text">{{ t('account.docs.done.body') }}</p>
      <p class="vel-docdone__text">{{ t('account.docs.done.note') }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Появление блока целиком: карточка меняет содержимое, и без него новое
   состояние возникало бы одним кадром поверх старого. */
.vel-docdone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
  padding-block: 0.5rem;
  animation: vel-docdone-in 260ms ease-out both;
  text-align: center;
}

.vel-docdone__sign {
  inline-size: 5.5rem;
  block-size: 5.5rem;
}

/* Заливка знака: тот же зелёный, разбавленный поверхностью карточки.
   Свой цвет здесь не заводится — только производная от токена. */
.vel-docdone__disc {
  fill: color-mix(in oklab, var(--color-success) 14%, var(--color-surface));
}

/*
  Контур начинают чертить с двенадцати часов: у <circle> путь стартует у трёх,
  и без поворота штрих пошёл бы от правого края. transform-box: fill-box даёт
  повороту собственный центр фигуры, а не начало координат холста.
*/
.vel-docdone__ring {
  fill: none;
  stroke: var(--color-success);
  stroke-width: 4;
  transform: rotate(-90deg);
  transform-box: fill-box;
  transform-origin: center;
}

.vel-docdone__tick {
  fill: none;
  stroke: var(--color-success);
  stroke-width: 5;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-docdone__copy {
  display: flex;
  max-inline-size: 26rem;
  flex-direction: column;
  gap: 0.375rem;
}

.vel-docdone__title {
  color: var(--color-fg);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.25;
}

.vel-docdone__text {
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.45;
}

@keyframes vel-docdone-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Сброс из main.css сжимает длительность до мгновения, но анимация всё равно
    проигрывается — снимаем её целиком.

    Прорисовку знака гасить здесь нечем и незачем: ею заведует gsap.matchMedia
    в скрипте, и без разрешения на движение она просто не создаётся, а знак
    остаётся нарисованным разметкой.
  */
  .vel-docdone {
    animation: none;
  }
}
</style>
