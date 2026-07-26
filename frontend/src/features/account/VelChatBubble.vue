<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChatAuthor, ChatDelivery } from '@/features/account/chat-thread'

/**
 * Один пузырь переписки.
 *
 * СВОИ СПРАВА, ЧУЖИЕ СЛЕВА — как в любом мессенджере. Сторона здесь не
 * украшение: по ней читают авторство быстрее, чем по цвету, и на монохромном
 * экране она остаётся единственным признаком (WCAG 1.4.1). Поэтому же у
 * последнего пузыря серии срезан угол с «своей» стороны — хвостик показывает
 * направление даже в оттенках серого.
 *
 * ВРЕМЯ ТОЛЬКО У ПОСЛЕДНЕГО В СЕРИИ. Пять сообщений подряд с одинаковым
 * временем превращают ленту в частокол цифр; человеку нужен момент, когда
 * серия закончилась, а не отметка на каждой строке.
 *
 * ПЕРЕНОСЫ СТРОК СОХРАНЯЮТСЯ (white-space: pre-wrap), но текст всё равно
 * переносится по словам: в сообщение вставляют номер договора или ссылку, и
 * длинное слово без переноса растянуло бы пузырь за край экрана.
 *
 * СОСТОЯНИЕ ОТПРАВКИ ПОКАЗАНО СЛОВОМ, А НЕ ГАЛОЧКАМИ. Двойная галочка в
 * мессенджерах значит «доставлено собеседнику»; пока сервера нет, сообщение
 * лежит в браузере, и рисовать ей нечего — это была бы ложь о доставке.
 */
const props = defineProps<{
  author: ChatAuthor
  text: string
  /**
   * ISO-8601 — форматируем здесь, по правилам языка интерфейса.
   * Пустая строка означает «времени нет»: так помечено приветствие поддержки,
   * которое не является событием переписки. Подставить ему «сейчас» значило
   * бы показать отметку, которой не существует.
   */
  at: string
  delivery: ChatDelivery
  /** Последний ли в череде сообщений одного автора. */
  last: boolean
}>()

const { t, d } = useI18n()

const own = computed(() => props.author === 'client')

/** Показывать отметку только у последнего в серии и только если время есть. */
const showMeta = computed(() => props.last && props.at !== '')

const timeText = computed(() => (props.at === '' ? '' : d(new Date(props.at), 'time')))

/** Полная дата и время — голосом: на экране стоит только «14:31». */
const stampLabel = computed(() => (props.at === '' ? '' : d(new Date(props.at), 'long')))
</script>

<template>
  <div class="vel-bubble" :class="[own ? 'vel-bubble--own' : 'vel-bubble--other', { 'vel-bubble--last': last }]">
    <div class="vel-bubble__body">
      <p class="vel-bubble__text">{{ text }}</p>

      <p v-if="showMeta" class="vel-bubble__meta">
        <time :datetime="at" class="vel-num">
          {{ timeText }}
          <span class="sr-only">{{ stampLabel }}</span>
        </time>

        <span v-if="own && delivery === 'local'" class="vel-bubble__state">
          {{ t('account.support.chat.stateLocal') }}
        </span>
        <span v-else-if="own && delivery === 'failed'" class="vel-bubble__state vel-bubble__state--bad">
          {{ t('account.support.chat.stateFailed') }}
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.vel-bubble {
  display: flex;
  /* Пузырь не тянется во всю ширину: короткое сообщение во всю строку
     читается как заголовок, а не как реплика. */
  max-inline-size: 100%;
}

/*
  ПОЯВЛЕНИЕ ПУЗЫРЯ — порт Magic UI Animated List. Там это motion-пружина
  (stiffness 350, damping 40) с originY: 0, то есть рост от своего верхнего
  края, а не из центра.

  ПРУЖИНУ ПЕРЕСЧИТАЛ, А НЕ СКОПИРОВАЛ НА ГЛАЗ. При stiffness 350 и damping 40
  собственная частота ω₀ = √350 ≈ 18.7 рад/с, коэффициент затухания
  ζ = 40 / (2√350) ≈ 1.07 — то есть пружина ПЕРЕзатухшая: она приходит к
  единице без отскока и успокаивается примерно за 380 мс. Значит верный
  перевод — плавное замедление, а не bounce: подпрыгивающие пузыри в
  переписке выглядят игрушечно, и это не вкусовщина, а то, что даёт исходная
  формула.

  Появление на CSS, а не на GSAP: движение однократное, на монтировании узла,
  и таймлайн под него держать не за чем.
*/
.vel-bubble {
  animation: vel-bubble-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-bubble--own {
  transform-origin: top right;
}

.vel-bubble--other {
  transform-origin: top left;
}

@keyframes vel-bubble-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(0.4rem);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.vel-bubble--own {
  justify-content: flex-end;
}

.vel-bubble--other {
  justify-content: flex-start;
}

.vel-bubble__body {
  max-inline-size: min(85%, 32rem);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-panel);
}

.vel-bubble--other .vel-bubble__body {
  background-color: var(--color-raised);
  color: var(--color-fg);
}

.vel-bubble--own .vel-bubble__body {
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
}

/* Хвостик у последнего в серии: срезанный угол с «своей» стороны. Форма, а не
   цвет, — она переживает и монохром, и дальтонизм. */
.vel-bubble--last.vel-bubble--own .vel-bubble__body {
  border-end-end-radius: 0.25rem;
}

.vel-bubble--last.vel-bubble--other .vel-bubble__body {
  border-end-start-radius: 0.25rem;
}

.vel-bubble__text {
  margin: 0;
  /* Переносы строк из поля ввода сохраняем, но длинное слово (номер договора,
     ссылка) обязано переноситься — иначе пузырь уезжает за край. */
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.45;
}

.vel-bubble__meta {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.4rem;
  margin: 0.2rem 0 0;
  font-size: 0.68rem;
  line-height: 1.2;
}

.vel-bubble--other .vel-bubble__meta {
  color: var(--color-muted);
}

/* На тёмной заливке приглушённый цвет светлой темы дал бы 1.4 — берём белый
   с прозрачностью: 78% даёт 6.9 к accent-deep при норме 4.5. */
.vel-bubble--own .vel-bubble__meta {
  color: color-mix(in oklab, var(--color-accent-ink) 78%, transparent);
}

.vel-bubble__state--bad {
  color: color-mix(in oklab, var(--color-accent-ink) 92%, var(--color-danger));
  font-weight: 600;
}

/* Своим пузырям — лёгкая тень: на светлом фоне ленты она отделяет их от
   поверхности, не добавляя ни рамки, ни второго цвета. */
.vel-bubble--own .vel-bubble__body {
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .vel-bubble {
    animation: none;
  }
}
</style>
