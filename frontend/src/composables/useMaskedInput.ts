import { computed, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { unrefElement, useEventListener } from '@vueuse/core'
import type { MaybeComputedElementRef } from '@vueuse/core'

/**
 * Ввод группами по N символов: IBAN и номер карты читаются четвёрками, а одной
 * простынёй из 27 знаков — нет. Пользователь сверяет их с пластиком или выпиской,
 * где они тоже разбиты на группы, поэтому разбивка — не украшение, а условие
 * того, чтобы человек нашёл опечатку глазами.
 *
 * ГЛАВНОЕ ЗДЕСЬ — КАРЕТКА. Самая частая поломка масок выглядит так: правишь
 * второй символ из двадцати, поле перерисовывается, и каретка оказывается в
 * конце строки. Дальше человек печатает не туда, где смотрит.
 *
 * Лечится не «запомнить позицию и вернуть»: позиция после разметки уже другая —
 * разделители могли появиться или исчезнуть слева от каретки. Поэтому считаем
 * не индекс, а СКОЛЬКО ЗНАЧАЩИХ СИМВОЛОВ было слева от каретки, и после
 * разметки ставим её после того же по счёту значащего символа. Разделители при
 * этом могут двигаться сколько угодно — точка привязки к ним не привязана.
 *
 * Второй подводный камень — Backspace на границе групп. Каретка стоит сразу за
 * пробелом, браузер стирает пробел, маска тут же ставит его обратно, и клавиша
 * «не работает». Поэтому такое удаление перехватывается в beforeinput и стирает
 * значащий символ ПЕРЕД разделителем — то, что пользователь и имел в виду.
 * Delete на том же месте — зеркально.
 *
 * Разделитель обязан НЕ проходить фильтр allow: на этом держится
 * идемпотентность разметки (format(format(x)) === format(x)), а на ней —
 * сверка в наблюдателе за model.
 */

/** Разделитель групп. Пробел не проходит ни один разумный allow. */
const SEPARATOR = ' '

/** Группа по умолчанию: и IBAN, и номер карты печатают четвёрками. */
const DEFAULT_GROUP_SIZE = 4

/** Что считается значащим символом, если вызывающий не уточнил. */
const DEFAULT_ALLOW = /[0-9A-Za-z]/

export interface MaskedInputOptions {
  /**
   * Значение поля. Композабл держит здесь УЖЕ размеченную строку — ровно то,
   * что видно в поле. Чистые символы для API берутся из `raw`.
   */
  model: Ref<string>
  /** Сколько значащих символов в группе. */
  groupSize?: MaybeRefOrGetter<number>
  /** Максимум значащих символов; лишнее в поле просто не попадает. */
  maxLength?: MaybeRefOrGetter<number>
  /** Фильтр значащего символа. БЕЗ флага g — см. matcher(). */
  allow?: MaybeRefOrGetter<RegExp>
  /** Приводить к верхнему регистру (код страны в IBAN — заглавный). */
  upper?: MaybeRefOrGetter<boolean>
}

export interface MaskedInputReturn {
  /** Только значащие символы, без разделителей: это и уходит в API. */
  raw: ComputedRef<string>
  /** Разметить произвольную строку по текущим правилам. Идемпотентна. */
  format: (value: string) => string
}

export function useMaskedInput(
  target: MaybeComputedElementRef,
  options: MaskedInputOptions,
): MaskedInputReturn {
  const { model } = options

  function groupSize(): number {
    const value = toValue(options.groupSize) ?? DEFAULT_GROUP_SIZE
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_GROUP_SIZE
  }

  function maxLength(): number {
    const value = toValue(options.maxLength) ?? Number.POSITIVE_INFINITY
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : Number.POSITIVE_INFINITY
  }

  function upper(): boolean {
    return toValue(options.upper) === true
  }

  /**
   * Фильтр символа в состоянии, пригодном для повторного test().
   *
   * Флаг g делает test() зависимым от lastIndex: на второй проверке того же
   * регулярного выражения он начинает искать с середины и отбрасывает валидный
   * символ. Клон без g — страховка от того, что вызывающий передал /…/g.
   */
  function matcher(): RegExp {
    const pattern = toValue(options.allow) ?? DEFAULT_ALLOW
    if (!pattern.global) return pattern
    return new RegExp(pattern.source, pattern.flags.replace('g', ''))
  }

  /** Значащие символы строки: фильтр, регистр, обрезка по максимуму. */
  function significant(value: string): string {
    const pattern = matcher()
    const limit = maxLength()
    let out = ''

    for (const char of value) {
      if (out.length >= limit) break
      if (!pattern.test(char)) continue
      out += upper() ? char.toUpperCase() : char
    }

    return out
  }

  function format(value: string): string {
    const chars = significant(value)
    const size = groupSize()
    const groups: string[] = []

    for (let index = 0; index < chars.length; index += size) {
      groups.push(chars.slice(index, index + size))
    }

    return groups.join(SEPARATOR)
  }

  /** Сколько значащих символов лежит слева от каретки. Это и есть привязка. */
  function significantBefore(value: string, caret: number): number {
    const pattern = matcher()
    const edge = Math.min(caret, value.length)
    let count = 0

    for (let index = 0; index < edge; index += 1) {
      const char = value[index]
      if (char !== undefined && pattern.test(char)) count += 1
    }

    return count
  }

  /** Позиция в размеченной строке сразу после n-го значащего символа. */
  function caretAfter(formatted: string, count: number): number {
    if (count <= 0) return 0
    let seen = 0

    for (let index = 0; index < formatted.length; index += 1) {
      if (formatted[index] !== SEPARATOR) seen += 1
      if (seen === count) return index + 1
    }

    return formatted.length
  }

  function resolve(): HTMLInputElement | null {
    const element = unrefElement(target)
    return element instanceof HTMLInputElement ? element : null
  }

  /**
   * Записать размеченное значение и поставить каретку.
   *
   * Порядок важен. Сначала DOM: v-model уже успел положить в model сырой текст,
   * и пока мы не догнали его размеченным, любая перерисовка вернула бы в поле
   * строку без разделителей. Затем каретка — присваивание value само уводит её
   * в конец. И только потом model: к моменту перерисовки el.value уже равен
   * новому значению, поэтому директива v-model поле не трогает и каретка
   * остаётся на месте.
   */
  function apply(input: HTMLInputElement, source: string, keepAfter: number): void {
    const formatted = format(source)

    if (input.value !== formatted) input.value = formatted

    const caret = caretAfter(formatted, keepAfter)
    input.setSelectionRange(caret, caret)

    model.value = formatted
  }

  /*
   * Удаление через разделитель. Браузер стёр бы сам пробел — то есть ничего,
   * потому что разделитель не часть значения и маска сразу вернёт его на место.
   * Перехватываем и стираем значащий символ, на который человек и целился.
   */
  useEventListener(
    () => resolve(),
    'beforeinput',
    (event: InputEvent) => {
      const input = resolve()
      if (!input) return

      const start = input.selectionStart
      // Выделение отдаём браузеру: там удаляется явно указанный кусок,
      // а не символ по соседству с кареткой.
      if (start === null || start !== input.selectionEnd) return

      if (event.inputType === 'deleteContentBackward') {
        // Разделитель не стоит первым ни в одной группе, поэтому start здесь
        // всегда больше двух; проверка — страховка от чужого формата.
        if (start < 2 || input.value[start - 1] !== SEPARATOR) return
        event.preventDefault()
        const next = input.value.slice(0, start - 2) + input.value.slice(start)
        apply(input, next, significantBefore(next, start - 2))
        return
      }

      if (event.inputType === 'deleteContentForward') {
        if (input.value[start] !== SEPARATOR) return
        event.preventDefault()
        const next = input.value.slice(0, start) + input.value.slice(start + 2)
        apply(input, next, significantBefore(next, start))
      }
    },
  )

  useEventListener(
    () => resolve(),
    'input',
    (event: Event) => {
      // Пока идёт набор через IME, строка в поле промежуточная: размечать её
      // значит рвать композицию на середине слова.
      if (event instanceof InputEvent && event.isComposing) return

      const input = resolve()
      if (!input) return

      const caret = input.selectionStart ?? input.value.length
      apply(input, input.value, significantBefore(input.value, caret))
    },
  )

  /*
   * Значение могли поставить мимо поля: сброс формы после отправки,
   * восстановление из стора, начальное значение. Разметка идемпотентна,
   * поэтому сверка «уже размечено?» не даёт цикла: второй проход возвращает
   * ту же строку и наблюдатель молчит.
   */
  watch(
    model,
    (value) => {
      const formatted = format(value)
      if (formatted !== value) model.value = formatted
    },
    { immediate: true },
  )

  const raw = computed(() => significant(model.value))

  return { raw, format }
}
