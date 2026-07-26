<script setup lang="ts">
import { onMounted, useId, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOtpInput } from '@/composables/useOtpInput'

/**
 * Поле кода подтверждения: шесть ячеек, одно поле по смыслу.
 *
 * ДЛЯ СКРИНРИДЕРА ЭТО ОДНО ПОЛЕ. Шесть input подряд он объявил бы шесть раз
 * подряд «поле ввода», ни разу не сказав, что вводить. Поэтому ячейки собраны
 * в role="group" с именем — им служит та же видимая строка «введите код из
 * шести цифр», что читает глазами зрячий, — и войдя в группу, человек слышит
 * задачу целиком. Дальше каждая ячейка называет только свою позицию
 * («цифра 3 из 6»): без этого он не понял бы, где находится курсор.
 *
 * Как ведёт себя ввод — вставка целого кода, Backspace, стрелки — решает
 * @/composables/useOtpInput.ts. Здесь только разметка, ARIA и оформление.
 *
 * Наружу отдаётся строка: v-model="code". Пустая строка снаружи чистит поле,
 * поэтому родителю не нужны ни ссылка на компонент, ни defineExpose.
 */
interface Props {
  /** Видимая строка-задание. Она же — доступное имя группы. */
  label: string
  /**
   * Увести фокус в первую ячейку сразу после появления. Поле показывается
   * в ответ на нажатие «отправить код», то есть фокус идёт туда, куда человек
   * только что попросил, — это продолжение его действия, а не самовольный
   * перехват при загрузке страницы.
   */
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), { autofocus: false })

const model = defineModel<string>({ default: '' })

const { t } = useI18n()

const labelId = `vel-otp-label-${useId()}`

const { digits, code, setCode, setCell, onInput, onKeydown, onPaste, onFocus, focusFirstEmpty } =
  useOtpInput()

/* Синхронизация в обе стороны с проверкой на равенство: без неё каждая
   правка ячейки возвращалась бы обратно в setCode и сбрасывала бы курсор. */
watch(code, (value) => {
  model.value = value
})

watch(model, (value) => {
  if (value !== code.value) setCode(value)
})

/** Приходит строка из v-model — раскладываем её по ячейкам на старте. */
if (model.value !== '') setCode(model.value)

onMounted(() => {
  if (props.autofocus) focusFirstEmpty()
})

/** :ref в шаблоне отдаёт union — сужаем до элемента поля. */
function bindCell(element: Element | ComponentPublicInstance | null, index: number): void {
  setCell(element instanceof HTMLInputElement ? element : null, index)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p :id="labelId" class="text-sm text-fg">{{ label }}</p>

    <div class="vel-otp" role="group" :aria-labelledby="labelId">
      <input
        v-for="(digit, index) in digits"
        :key="index"
        :ref="(element) => bindCell(element, index)"
        class="vel-otp__cell vel-num"
        type="text"
        inputmode="numeric"
        maxlength="1"
        spellcheck="false"
        :autocomplete="index === 0 ? 'one-time-code' : 'off'"
        :value="digit"
        :aria-label="t('account.security.verify.digit', { index: index + 1, total: digits.length })"
        @input="onInput(index, $event)"
        @keydown="onKeydown(index, $event)"
        @paste="onPaste(index, $event)"
        @focus="onFocus"
      />
    </div>
  </div>
</template>

<style scoped>
/*
  ПЕРЕНОСА НЕТ, И ЭТО ГЛАВНОЕ ЗДЕСЬ. Код из шести цифр читается как одно
  число: разложенный на две строки, он превращается в два трёхзначных, а
  человек, сверяющий его с письмом, теряет место. Замерено: в колонке 230px
  с flex-wrap ряд ломался на 4 + 2.

  Поэтому ячейки сжимаются, а не переносятся: nowrap плюс разрешённое сжатие
  (flex-shrink и min-inline-size ниже базиса). Ряд остаётся одной строкой
  в любой колонке, где кабинет вообще показывают.
*/
.vel-otp {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
}

/*
  Ячейка тянется вместе с рядом: базис 2.5rem, потолок 3.25rem — шире плашки
  под одну цифру не нужно, — а пол 1.75rem не даёт ей схлопнуться в щель.
  В самой узкой колонке (экран 320px) шесть ячеек с промежутками занимают
  около 200px при доступных 240.
*/
.vel-otp__cell {
  min-inline-size: 1.75rem;
  flex: 1 1 2.5rem;
  max-inline-size: 3.25rem;
  block-size: 3.25rem;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  background-color: var(--color-ground);
  color: var(--color-fg);
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
  transition: border-color 150ms ease;
}

.vel-otp__cell:hover {
  border-color: var(--color-accent);
}

/* Кольцо фокуса приходит из @layer base: у контролов там мягкое гало и
   акцентная рамка, второй раз его описывать не нужно. */

@media (prefers-reduced-motion: reduce) {
  /* Сброс в main.css правит только длительность — снимаем переход целиком. */
  .vel-otp__cell {
    transition: none;
  }
}
</style>
