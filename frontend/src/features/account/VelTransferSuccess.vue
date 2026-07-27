<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onKeyStroke, useScrollLock, useTimeoutFn } from '@vueuse/core'
import { gsap } from 'gsap'
import { useGsapContext } from '@/composables/useGsapContext'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Финал перевода: знак Velora прорисовывается на весь экран.
 *
 * РАСКАДРОВКА взята с присланного образца (CodePen «Success svg animation»)
 * и повторена по долям секунды: кольцо обводится за 0.6 с кривой
 * cubic-bezier(0.65, 0, 0.45, 1); заливка круга начинается на 0.4 с и идёт
 * 0.4 с; фигура внутри прорисовывается на 0.8 с за 0.3 с; на 0.9 с вся марка
 * даёт импульс масштаба до 1.1 и обратно за 0.3 с. Галка заменена на «V»
 * Velora — по той же механике обводки штриха.
 *
 * ПОЧЕМУ НЕ CSS-КЛЮЧЕВЫЕ КАДРЫ, КАК В ОБРАЗЦЕ. Там анимация одноразовая и
 * ничем не управляется. Здесь окно должно закрываться само, и закрытие обязано
 * висеть на ТАЙМЕРЕ, а не на конце анимации: при отключённых анимациях
 * завершения не наступает вовсе, и окно осталось бы на экране навсегда.
 * Таймер и таймлайн живут независимо — это правило проекта.
 */
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()

/** Через сколько окно уходит само, мс. Хватает досмотреть и не успеть устать. */
const HOLD_MS = 3600

/* Фон под окном не должен уезжать под пальцем: окно занимает весь экран,
   и прокрутка страницы за ним читается как поломка. */
const locked = useScrollLock(document.body)

const root = useGsapContext(() => {
  const host = root.value
  if (!host) return

  const ring = host.querySelector<SVGCircleElement>('.vel-done__ring')
  const disc = host.querySelector<SVGCircleElement>('.vel-done__disc')
  const glyph = host.querySelector<SVGPathElement>('.vel-done__glyph')
  const mark = host.querySelector<SVGSVGElement>('.vel-done__mark')
  if (!ring || !disc || !glyph || !mark) return

  /* Длину обводки берём у самих фигур, а не константами из образца: там стояли
     166 и 48 под конкретный радиус, и любая правка геометрии молча ломала бы
     прорисовку — штрих открывался бы не до конца или рывком. */
  const ringLength = ring.getTotalLength()
  const glyphLength = glyph.getTotalLength()

  const media = gsap.matchMedia()

  media.add('(prefers-reduced-motion: no-preference)', () => {
    /*
     * Прячем ДО первой отрисовки, а не первым шагом таймлайна.
     *
     * Таймлайн показывает своё нулевое состояние на ближайшем кадре GSAP, а он
     * наступает уже после того, как браузер вывел страницу: зритель успел бы
     * увидеть готовое кольцо со знаком, которые тут же схлопнулись бы и начали
     * рисоваться заново. Эти три вызова идут синхронно внутри onMounted, то
     * есть до первой отрисовки, и мелькания не остаётся.
     *
     * В CSS это не унести: длина штриха меряется у самих фигур, а числами из
     * образца (166 и 48) она была бы привязана к чужой геометрии.
     */
    gsap.set(ring, { strokeDasharray: ringLength, strokeDashoffset: ringLength })
    gsap.set(glyph, { strokeDasharray: glyphLength, strokeDashoffset: glyphLength })
    gsap.set(disc, { scale: 0, transformOrigin: 'center' })

    const draw = gsap.timeline()

    draw
      /* 1. Кольцо обводится.
         В образце стояла cubic-bezier(0.65, 0, 0.45, 1). Голый GSAP таких
         строк не понимает — для них нужен отдельный плагин CustomEase, и
         неизвестное имя он молча заменит на свою кривую по умолчанию, то есть
         вся выверенная раскадровка поехала бы незаметно. power2.inOut — та же
         симметричная кривая с плавным входом и выходом, встроенная. */
      .to(ring, {
        strokeDashoffset: 0,
        duration: 0.6,
        ease: 'power2.inOut',
      })
      // 2. Круг заливается — начинается, не дожидаясь конца обводки
      .to(disc, { scale: 1, duration: 0.4, ease: 'power2.inOut' }, 0.4)
      // 3. Знак прорисовывается поверх заливки
      .to(glyph, {
        strokeDashoffset: 0,
        duration: 0.3,
        ease: 'power2.inOut',
      }, 0.8)
      // 4. Импульс всей марки
      .to(mark, { scale: 1.1, duration: 0.15, ease: 'power1.out', transformOrigin: 'center' }, 0.9)
      .to(mark, { scale: 1, duration: 0.15, ease: 'power1.in' }, 1.05)

    // Подпись догоняет знак, а не появляется вместе с ним: сначала событие,
    // потом объяснение.
    draw.from(
      host.querySelectorAll('.vel-done__text > *'),
      { opacity: 0, y: 12, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
      1.1,
    )
  })

  media.add('(prefers-reduced-motion: reduce)', () => {
    // Никакой прорисовки: сразу конечный вид. Штрих открыт, круг залит.
    gsap.set(ring, { strokeDasharray: 'none', strokeDashoffset: 0 })
    gsap.set(glyph, { strokeDasharray: 'none', strokeDashoffset: 0 })
    gsap.set(disc, { scale: 1, transformOrigin: 'center' })
  })
})

/*
 * Закрытие по таймеру — независимо от того, доиграла анимация или нет
 * (см. заголовок файла). start() зовём при каждом открытии: окно показывается
 * не один раз за сессию.
 */
const { start: startClose, stop: stopClose } = useTimeoutFn(
  () => {
    open.value = false
  },
  HOLD_MS,
  { immediate: false },
)

function close(): void {
  stopClose()
  open.value = false
}

// Esc закрывает — это модальное окно, и выход с клавиатуры обязателен.
onKeyStroke('Escape', () => {
  if (open.value) close()
})

watch(
  open,
  async (isOpen) => {
    locked.value = isOpen
    if (!isOpen) {
      stopClose()
      return
    }

    startClose()
    // Фокус переводим на само окно: иначе он остался бы на кнопке под ним,
    // и скринридер не сообщил бы о появлении экрана.
    await nextTick()
    root.value?.focus()
  },
  { immediate: true },
)

const title = computed(() => t('account.commission.done.title'))
</script>

<template>
  <Teleport to="body" defer>
    <div
      v-if="open"
      ref="root"
      class="vel-done"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <svg class="vel-done__mark" viewBox="0 0 52 52" aria-hidden="true">
        <!-- Круг заливки лежит под кольцом: он растёт из центра и не должен
             перекрывать обводку, которая рисуется по тому же радиусу. -->
        <circle class="vel-done__disc" cx="26" cy="26" r="24" />
        <circle class="vel-done__ring" cx="26" cy="26" r="24" fill="none" />
        <!-- «V» с восходящим правым штрихом — тот же знак, что в логотипе.
             В образце здесь была галка; механика прорисовки штриха та же. -->
        <path class="vel-done__glyph" d="M 16.5 17 L 25 35.5 L 36.5 14.5" fill="none" />
      </svg>

      <div class="vel-done__text">
        <h2 class="vel-done__title">{{ title }}</h2>
        <p class="vel-done__lead">{{ t('account.commission.done.lead') }}</p>
        <VelButton type="button" @click="close">
          {{ t('account.commission.done.action') }}
        </VelButton>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vel-done {
  position: fixed;
  inset: 0;
  /* Выше мастера и кабинета: это финальный экран, перекрывать его нечему. */
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  background-color: var(--color-surface);
}

.vel-done:focus {
  outline: none;
}

.vel-done__mark {
  inline-size: clamp(7rem, 26vmin, 11rem);
  block-size: clamp(7rem, 26vmin, 11rem);
}

.vel-done__disc {
  fill: var(--color-accent);
}

.vel-done__ring {
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-linecap: round;
  /* Обводка начинается сверху, а не справа: так кольцо «закрывается» на
     привычном глазу месте. */
  transform: rotate(-90deg);
  transform-origin: center;
}

.vel-done__glyph {
  stroke: var(--color-accent-ink);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-done__text {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  text-align: center;
}

.vel-done__title {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
}

.vel-done__lead {
  max-inline-size: 34ch;
  margin: 0;
  color: var(--color-muted);
}

@media (forced-colors: active) {
  /* В режиме высокой контрастности системная палитра затирает заливку —
     возвращаем видимую границу, иначе от знака остаётся пустое место. */
  .vel-done__ring {
    stroke: CanvasText;
  }
}
</style>
