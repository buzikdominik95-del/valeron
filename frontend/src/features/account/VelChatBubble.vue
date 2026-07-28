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
      <!-- Имя менеджера над репликой поддержки -->
      <p v-if="!own" class="vel-bubble__agent-name">
        {{ t('account.support.chat.agentName') }}
      </p>
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
  Появление пузыря: свои — с права (как ушли из поля ввода),
  чужие — слева. CSS, не GSAP: однократный mount, без таймлайна.
*/
.vel-bubble {
  animation: vel-bubble-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-bubble--own {
  justify-content: flex-end;
  transform-origin: bottom right;
  animation-name: vel-bubble-own-in;
}

.vel-bubble__agent-name {
  margin: 0 0 0.2rem;
  color: var(--color-success);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.vel-bubble--other {
  justify-content: flex-start;
  transform-origin: bottom left;
  animation-name: vel-bubble-other-in;
}

@keyframes vel-bubble-own-in {
  from {
    opacity: 0;
    transform: scale(0.88) translate(0.85rem, 0.55rem);
  }

  60% {
    opacity: 1;
  }

  to {
    opacity: 1;
    transform: scale(1) translate(0, 0);
  }
}

@keyframes vel-bubble-other-in {
  from {
    opacity: 0;
    transform: scale(0.9) translate(-0.55rem, 0.4rem);
  }

  to {
    opacity: 1;
    transform: scale(1) translate(0, 0);
  }
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

/* Тень + короткий glow на появлении: отделяет свои пузыри от фона. */
.vel-bubble--own .vel-bubble__body {
  box-shadow: 0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  animation: vel-bubble-glow 0.7s ease-out both;
}

@keyframes vel-bubble-glow {
  from {
    box-shadow:
      0 0 0 0 color-mix(in oklab, var(--color-accent) 40%, transparent),
      0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  }

  to {
    box-shadow: 0 2px 10px color-mix(in oklab, var(--color-accent-deep) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-bubble,
  .vel-bubble--own .vel-bubble__body {
    animation: none;
  }
}
</style>
