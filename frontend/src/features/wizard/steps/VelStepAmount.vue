<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/cn'
import { useCreditSimulator } from '@/composables/useCreditSimulator'
import { useWizard } from '@/composables/useWizard'
import { useStaggerReveal } from '@/composables/useStaggerReveal'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Шаг 1 мастера: сумма кредита.
 * Границы, шаг и нормализация живут в useCreditSimulator — здесь только маска
 * ввода. Пока пользователь печатает, источник правды — строка из одних цифр:
 * промежуточное «12» не должно улетать в стор и зажиматься там до минимума,
 * иначе поле начнёт драться с пользователем.
 */
const { t, n } = useI18n()
const { amount, min, max } = useCreditSimulator()
const { next } = useWizard()

const uid = useId()
const formId = `vel-amount-form-${uid}`
const inputId = `vel-amount-${uid}`
const rangeId = `${inputId}-range`
const hintId = `${inputId}-hint`
const formRoot = useTemplateRef<HTMLElement>('formRoot')
useStaggerReveal(formRoot, { y: 18, stagger: 0.09, duration: 0.44, delay: 0.05 })

const digits = ref(String(amount.value))

/** Разделители тысяч берутся из локали, а не зашиваются в компонент. */
function format(value: string): string {
  return value === '' ? '' : n(Number(value), 'decimal')
}

const display = computed(() => format(digits.value))
const parsed = computed(() => (digits.value === '' ? null : Number(digits.value)))
const isValid = computed(() => parsed.value !== null && parsed.value >= min && parsed.value <= max)

const minText = computed(() => n(min, 'currency'))
const maxText = computed(() => n(max, 'currency'))

// Сумму мог изменить кто-то снаружи (калькулятор на странице) — поле подхватит
// новое значение. Набор текста при этом не сбивается: во время ввода стор молчит,
// значение уходит туда только по потере фокуса.
watch(amount, (value) => {
  if (parsed.value !== value) digits.value = String(value)
})

/** Позиция каретки после перерисовки маски: считаем по количеству цифр слева. */
function caretAfterDigits(text: string, count: number): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i += 1) {
    if (!/\d/.test(text[i] ?? '')) continue
    seen += 1
    if (seen === count) return i + 1
  }
  return text.length
}

function onInput(event: Event): void {
  const element = event.target as HTMLInputElement
  const previous = display.value
  const raw = element.value
  const caret = element.selectionStart ?? raw.length

  let left = raw.slice(0, caret).replace(/\D/g, '')
  const right = raw.slice(caret).replace(/\D/g, '')

  // Backspace на разделителе: маска вернёт разделитель на место, и нажатие
  // выглядело бы как «ничего не произошло». Убираем цифру перед ним.
  // Условие на длину отсекает удаление выделенного куска — там правило другое.
  const backspace = (event as InputEvent).inputType === 'deleteContentBackward'
  if (backspace && raw.length === previous.length - 1 && !/\d/.test(previous[caret] ?? '')) {
    left = left.slice(0, -1)
  }

  const all = left + right
  const stripped = all.replace(/^0+(?=\d)/, '')
  // 9 цифр с запасом перекрывают максимум и защищают от вставки простыни текста.
  const nextDigits = stripped.slice(0, 9)
  digits.value = nextDigits

  // Пишем в DOM сами: если ввод не изменил цифры (нажали букву), Vue не станет
  // перерисовывать поле и в нём останется мусор; а после перерисовки каретка
  // уехала бы в конец строки.
  const masked = format(nextDigits)
  element.value = masked
  const kept = Math.max(0, Math.min(left.length - (all.length - stripped.length), nextDigits.length))
  const position = caretAfterDigits(masked, kept)
  element.setSelectionRange(position, position)
}

/**
 * Снап к шагу делает нормализация внутри useCreditSimulator.
 * Значение вне границ намеренно НЕ зажимаем: иначе кнопка «дальше» разблокируется
 * сама собой по потере фокуса, и запрет на выход за границы станет фикцией.
 */
function commit(): void {
  if (parsed.value === null || !isValid.value) return
  amount.value = parsed.value
  digits.value = String(amount.value)
}

function onSubmit(): void {
  commit()
  if (!isValid.value) return
  next()
}

const inputClass = computed(() =>
  cn(
    'vel-num h-20 w-full rounded-control border bg-ground',
    'pr-14 pl-4 text-3xl transition-colors duration-150',
    // Кольцо фокуса задаётся утилитами намеренно — см. комментарий в VelButton.
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    isValid.value ? 'border-line-strong hover:border-accent' : 'border-danger',
  ),
)
</script>

<template>
  <form
    :id="formId"
    ref="formRoot"
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
  >
    <div data-reveal class="flex flex-col gap-3">
      <!-- Надзаголовок он же подпись поля: связка через for даёт вводу имя,
           не дублируя текст в aria-label. -->
      <label :for="inputId" class="vel-label">{{ t('wizard.amount.lead') }}</label>
      <h1 class="vel-amount__title text-3xl sm:text-4xl">{{ t('wizard.amount.title') }}</h1>
    </div>

    <div data-reveal class="flex flex-col gap-2">
      <div class="vel-amount__box">
        <input
          :id="inputId"
          :class="inputClass"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          :value="display"
          :aria-describedby="`${rangeId} ${hintId}`"
          :aria-invalid="isValid ? undefined : true"
          @input="onInput"
          @blur="commit"
        />
        <span class="vel-amount__unit vel-num" aria-hidden="true">€</span>
      </div>

      <!-- Границы показаны цифрами, а не фразой: только так видно, почему
           кнопка «дальше» заблокирована, и перевод для этого не нужен. -->
      <p :id="rangeId" class="vel-num flex justify-between text-xs text-faint">
        <span>{{ minText }}</span>
        <span>{{ maxText }}</span>
      </p>
    </div>

    <!--
      Ширину не режем: подсказка обязана совпадать по краям с полем ввода над
      ней. Здесь стоял .vel-measure (потолок 52ch) — он держит длинную строку в
      читаемой мере, но эта плашка не абзац текста, а рамка под полем, и
      обрезанная по 52ch она заканчивалась заметно левее поля. Две рамки одна
      под другой с разными правыми краями читаются как съехавшая вёрстка.
      Строка внутри короткая, и без потолка мера не страдает.
    -->
    <p
      :id="hintId"
      data-reveal
      class="rounded-control border border-line bg-surface px-3.5 py-2.5 text-xs text-muted"
    >
      {{ t('wizard.amount.hint') }}
    </p>
  </form>

  <!-- Кнопка живёт в панели навигации оболочки, а форма — в области содержимого,
       поэтому связь только через атрибут form. -->
  <Teleport to="#vel-wizard-actions" defer>
    <VelButton type="submit" :form="formId" :disabled="!isValid">
      {{ t('wizard.next') }}
      <span aria-hidden="true">→</span>
    </VelButton>
  </Teleport>
</template>

<style scoped>
/* Заголовок ломается надвое узкой колонкой, а не переносом внутри строки
   перевода: pre-line оставлен на случай, если перенос всё же придёт из локали. */
.vel-amount__title {
  max-width: 18ch;
  white-space: pre-line;
}

.vel-amount__box {
  position: relative;
}

/* Знак валюты прибит к правому краю поля — под него у поля увеличен padding. */
.vel-amount__unit {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  color: var(--color-muted);
  font-size: 1.5rem;
  pointer-events: none;
}
</style>
