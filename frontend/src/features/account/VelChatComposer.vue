<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHAT_MAX_LENGTH } from '@/features/account/chat-thread'

/**
 * Строка ввода переписки: поле и кнопка отправки.
 *
 * ПОЛЕ РАСТЁТ ПОД ТЕКСТ, но не бесконечно. Однострочный <input> резал бы
 * сообщение на длинные вопросы, а textarea фиксированной высоты либо занимает
 * пол-экрана впустую, либо прокручивается внутри себя на трёх строках.
 * Высота считается по scrollHeight и упирается в потолок — дальше поле
 * прокручивается само.
 *
 * ПОЧЕМУ ВЫСОТУ СТАВИТ СКРИПТ, А НЕ CSS. Содержимое поля браузер измерить
 * средствами CSS не даёт: field-sizing: content решает это одной строкой, но
 * его нет ни в Safari, ни в Firefox — то есть у большей части телефонов
 * поле осталось бы в одну строку.
 *
 * ENTER ОТПРАВЛЯЕТ, SHIFT+ENTER ПЕРЕНОСИТ — как в мессенджерах. На телефоне
 * Enter в экранной клавиатуре обычно и есть «отправить», а кому нужен абзац,
 * тот жмёт сочетание; обратный порядок заставлял бы целиться в кнопку после
 * каждой реплики.
 */
const model = defineModel<string>({ required: true })

const props = defineProps<{ canSend: boolean }>()

const emit = defineEmits<{ send: [] }>()

const { t } = useI18n()

/** Потолок роста поля. Пять строк — дальше читать в ленте всё равно удобнее. */
const MAX_ROWS = 5
const LINE_REM = 1.35

const area = ref<HTMLTextAreaElement | null>(null)

const rest = computed(() => CHAT_MAX_LENGTH - model.value.length)

/** Счётчик показываем только у края: он служит предупреждением, а не фоном. */
const showRest = computed(() => rest.value <= 120)

function resize(): void {
  const element = area.value
  if (element === null) return

  /*
   * Сброс перед замером обязателен: scrollHeight никогда не уменьшается сам,
   * и без него поле, однажды выросшее на пять строк, таким и осталось бы
   * после удаления текста.
   */
  element.style.height = 'auto'

  const max = MAX_ROWS * LINE_REM * parseFloat(getComputedStyle(document.documentElement).fontSize)
  element.style.height = `${Math.min(element.scrollHeight, max)}px`
}

watch(model, () => void nextTick(resize), { immediate: true })

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey) return
  // Пока идёт набор иероглифов или диакритики, Enter подтверждает вариант в
  // клавиатуре, а не заканчивает сообщение.
  if (event.isComposing) return

  event.preventDefault()
  if (props.canSend) emit('send')
}
</script>

<template>
  <form class="vel-composer" @submit.prevent="emit('send')">
    <label class="sr-only" for="vel-chat-input">{{ t('account.support.chat.inputLabel') }}</label>

    <textarea
      id="vel-chat-input"
      ref="area"
      v-model="model"
      class="vel-composer__area"
      rows="1"
      :maxlength="CHAT_MAX_LENGTH"
      :placeholder="t('account.support.chat.placeholder')"
      @keydown="onKeydown"
    ></textarea>

    <button
      type="submit"
      class="vel-composer__send"
      :disabled="!canSend"
      :aria-label="t('account.support.chat.send')"
    >
      <!-- Бумажный самолётик: контур той же породы, что остальные знаки. -->
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3.5 11.5 20.5 4l-7.5 17-2.2-7.3z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="miter"
        />
        <path d="m10.8 13.7 4.4-4.4" stroke="currentColor" stroke-width="1.8" />
      </svg>
    </button>

    <p v-if="showRest" class="vel-composer__rest vel-num" aria-live="polite">
      {{ rest }}
    </p>
  </form>
</template>

<style scoped>
.vel-composer {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.5rem;
  border-block-start: 1px solid var(--color-line);
  background-color: var(--color-surface);
}

.vel-composer__area {
  min-inline-size: 0;
  flex: 1 1 auto;
  /*
    Высоту ставит скрипт; здесь только границы, между которыми ему разрешено
    её двигать.

    Нижняя граница — цель нажатия 2.75rem (WCAG 2.5.5). Без неё поле в одну
    строку выходило 37px: замерено аудитом, и палец на телефоне промахивался
    бы мимо единственного места, куда на этом экране вообще нужно попадать.
    min-block-size перебивает inline-высоту от скрипта, поэтому автоподгонка
    остаётся рабочей — просто не опускается ниже минимума.
  */
  min-block-size: 2.75rem;
  max-block-size: 9rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-panel);
  background-color: var(--color-ground);
  color: var(--color-fg);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.35;
  resize: none;
}

.vel-composer__area:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.vel-composer__send {
  display: inline-flex;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-round);
  background-color: var(--color-accent-deep);
  color: var(--color-accent-ink);
  cursor: pointer;
  transition: background-color 150ms ease;
}

.vel-composer__send:hover:not(:disabled) {
  background-color: var(--color-accent-dim);
}

.vel-composer__send:disabled {
  background-color: var(--color-track);
  color: var(--color-faint);
  cursor: not-allowed;
}

.vel-composer__send:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.vel-composer__send svg {
  inline-size: 1.15rem;
  block-size: 1.15rem;
}

/* Счётчик остатка висит над полем, не раздвигая строку ввода: иначе при
   приближении к пределу поле дёргалось бы по высоте. */
.vel-composer__rest {
  position: absolute;
  inset-block-start: -1.1rem;
  inset-inline-end: 0.6rem;
  margin: 0;
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .vel-composer__send {
    transition: none;
  }
}
</style>
