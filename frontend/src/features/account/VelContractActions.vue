<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Три действия карточки подписания: открыть PDF, указать счёт, подписать.
 *
 * ПОЧЕМУ ОТДЕЛЬНО ОТ КАРТОЧКИ. Три кнопки со своими состояниями, знаками и
 * заливками — это полторы сотни строк оформления, и вместе с карточкой файл
 * выходил за предел, после которого его перестают читать целиком. Карточка
 * осталась раскладкой, кнопки — кнопками.
 *
 * НИЧЕГО НЕ РЕШАЕТ И ЗДЕСЬ: все четыре состояния приходят пропами, все три
 * действия уходят наверх событиями. Кому открывать окно и куда вести — знает
 * страница, а не ряд кнопок.
 *
 * ВНЕСЁННЫЙ СЧЁТ — СОСТОЯНИЕ, А НЕ ДЕЙСТВИЕ: на его месте стоит текст с
 * галочкой, а не запертая кнопка. Заблокированная кнопка означает «сюда можно,
 * но не сейчас»; здесь же нажимать не на что вовсе.
 */
interface Props {
  /** Есть что открывать: ссылка на договор пришла с сервера. */
  hasPdf: boolean
  /** Документы приняты и договор ещё не подписан. */
  canSign: boolean
  /** Счёт для зачисления уже указан. */
  hasIban: boolean
  /** Договор подписан — кнопка подписи превращается в отметку. */
  isSigned: boolean
  /** PDF уже вынесен в заголовок карточки — здесь не дублируем. */
  hidePdf?: boolean
}

const props = withDefaults(defineProps<Props>(), { hidePdf: false })

const emit = defineEmits<{
  openPdf: []
  enterIban: []
  sign: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="vel-cactions">
    <button
      v-if="!props.hidePdf"
      type="button"
      class="vel-cactions__btn vel-cactions__btn--pdf"
      :disabled="!hasPdf"
      @click="emit('openPdf')"
    >
      <svg class="vel-cactions__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h7.5l5 5v12H6z" />
        <path d="M13.5 3.5v5h5" />
        <path d="M12.25 11.5v6M9.75 15l2.5 2.5 2.5-2.5" />
      </svg>
      {{ t('contract.card.openPdf') }}
    </button>

    <p v-if="hasIban" class="vel-cactions__state">
      <svg class="vel-cactions__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
      </svg>
      {{ t('contract.card.ibanDone') }}
    </p>

    <button
      v-else
      type="button"
      class="vel-cactions__btn vel-cactions__btn--iban"
      @click="emit('enterIban')"
    >
      {{ t('contract.card.enterIban') }}
    </button>

    <button
      type="button"
      class="vel-cactions__btn vel-cactions__btn--sign"
      :disabled="!canSign"
      @click="emit('sign')"
    >
      <svg v-if="isSigned" class="vel-cactions__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
      </svg>
      {{ isSigned ? t('contract.card.signed') : t('contract.card.sign') }}
    </button>
  </div>
</template>

<style scoped>
/*
  Ряд с переносом: на узкой карточке кнопки идут под текстом и делят строку,
  а не выстраиваются в колонку шириной в ладонь.

  ОБА СОСТОЯНИЯ РАСКЛАДКИ ЖИВУТ ЗДЕСЬ, хотя контейнер объявляет карточка
  (container-name: vel-contract-card). Так сделано намеренно: правь ряд
  из карточки — её и наши правила получили бы ОДИНАКОВУЮ специфичность, и спор
  за flex-wrap решал бы порядок подключения стилей, то есть порядок импортов.
  Такое «работает, пока не переставили импорт» в проекте недопустимо. Внутри
  одного файла порядок задан текстом, и спорить не о чем.
*/
.vel-cactions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  min-inline-size: 0;
}

.vel-cactions__btn,
.vel-cactions__state {
  display: inline-flex;
  flex: 1 1 9.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0;
  /* Цель нажатия не ниже 2.75rem — норма WCAG 2.5.8 и правило проекта. */
  min-block-size: 2.75rem;
  min-inline-size: 0;
  padding-inline: 1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: center;
}

.vel-cactions__btn {
  /* preflight Tailwind v4 отдаёт кнопкам браузерное `default` — палец ставим
     руками, как и у остальных кнопок проекта. */
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    transform 100ms ease;
}

.vel-cactions__btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.vel-cactions__btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Светлая с рамкой: открыть документ — действие второстепенное. */
.vel-cactions__btn--pdf {
  border-color: var(--color-line-strong);
  background-color: var(--color-surface);
  color: var(--color-fg);
}

.vel-cactions__btn--pdf:hover:not(:disabled) {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
}

/* Заливка тёмным синим: реквизиты нужны, но это ещё не подпись. */
.vel-cactions__btn--iban {
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
}

.vel-cactions__btn--iban:hover:not(:disabled) {
  background-color: var(--color-accent-dim);
}

/* Акцент: главное действие экрана. */
.vel-cactions__btn--sign {
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.vel-cactions__btn--sign:hover:not(:disabled) {
  background-color: var(--color-accent-dim);
}

.vel-cactions__state {
  border-color: color-mix(in oklab, var(--color-success) 45%, transparent);
  background-color: color-mix(in oklab, var(--color-success) 10%, var(--color-surface));
  color: var(--color-success);
}

.vel-cactions__icon {
  flex: 0 0 auto;
  inline-size: 1.05rem;
  block-size: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

/* Широкая карточка: колонка одинаковых кнопок у правого края — они читаются
   как один блок, а не как лесенка разной длины. */
@container vel-contract-card (min-width: 34rem) {
  .vel-cactions {
    flex: 0 0 auto;
    flex-direction: column;
    flex-wrap: nowrap;
    inline-size: 13rem;
  }

  .vel-cactions__btn,
  .vel-cactions__state {
    flex: 0 0 auto;
    inline-size: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Общий сброс в main.css правит только длительность — сам scale остался бы
     и срабатывал мгновенным скачком. Снимаем его целиком. */
  .vel-cactions__btn {
    transition: none;
  }

  .vel-cactions__btn:active:not(:disabled) {
    transform: none;
  }
}
</style>
