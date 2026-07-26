import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/**
 * Ввод кода подтверждения по ячейкам — но по-человечески.
 *
 * Шесть отдельных полей это решение оформления, а не способ ввода. Человек
 * приходит с кодом в буфере обмена и вставляет его целиком; человек стирает
 * ошибку клавишей Backspace и ждёт, что курсор сам вернётся в предыдущую
 * ячейку; человек ходит по ячейкам стрелками. Всё это здесь и лежит, поэтому
 * компоненту остаётся только разметка и ARIA.
 *
 * Состояние — массив односимвольных строк, а не одна строка: у каждой ячейки
 * своё значение, и дырка посередине (вторая цифра стёрта, третья на месте)
 * обязана сохраняться, иначе стирание сдвигало бы уже введённые цифры влево.
 *
 * DOM трогаем ровно в двух местах: фокус ячейки и синхронизация её value.
 * Слушателей здесь нет вовсе — их вешает шаблон компонента (@input, @keydown,
 * @paste, @focus), поэтому снимать за собой нечего.
 */

/**
 * Столько цифр в коде подтверждения почты. Экспортируется, потому что то же
 * число проверяет полнота кода в панели безопасности: два независимых «шесть»
 * рано или поздно разъедутся.
 */
export const OTP_LENGTH = 6

/** Всё, что не цифра, выбрасывается — и из набора, и из буфера обмена. */
const NOT_DIGIT = /\D+/g

export interface UseOtpInputOptions {
  /** Число ячеек. По умолчанию шесть. */
  length?: number
}

export interface OtpInputApi {
  /** По одному символу на ячейку; пустая ячейка — пустая строка. */
  digits: Ref<string[]>
  /** Набранный код целиком. Неполный код тоже отдаётся — решает вызывающий. */
  code: ComputedRef<string>
  isComplete: ComputedRef<boolean>
  /** Разложить готовую строку по ячейкам: сброс поля снаружи, автозаполнение. */
  setCode: (value: string) => void
  /** Запомнить элемент ячейки — вешается через :ref в шаблоне. */
  setCell: (element: HTMLInputElement | null, index: number) => void
  onInput: (index: number, event: Event) => void
  onKeydown: (index: number, event: KeyboardEvent) => void
  onPaste: (index: number, event: ClipboardEvent) => void
  onFocus: (event: FocusEvent) => void
  /** Фокус в первую незаполненную ячейку, иначе в последнюю. */
  focusFirstEmpty: () => void
}

export function useOtpInput(options: UseOtpInputOptions = {}): OtpInputApi {
  const length = Math.max(1, Math.trunc(options.length ?? OTP_LENGTH))

  const digits = ref<string[]>(Array.from({ length }, () => ''))

  /**
   * Элементы ячеек. Обычный массив, а не ref: реактивность здесь не нужна —
   * по ссылкам только зовут focus(), в разметке они не участвуют.
   */
  const cells: (HTMLInputElement | null)[] = Array.from({ length }, () => null)

  function setCell(element: HTMLInputElement | null, index: number): void {
    if (index < 0 || index >= length) return
    cells[index] = element
  }

  function digitAt(index: number): string {
    return digits.value[index] ?? ''
  }

  function writeDigit(index: number, value: string): void {
    if (index < 0 || index >= length) return
    digits.value[index] = value
  }

  /**
   * Фокус с упором в края: за пределы поля курсор не выходит, а выделение
   * содержимого позволяет перебить цифру набором поверх неё.
   */
  function focusCell(index: number): void {
    const target = Math.min(Math.max(index, 0), length - 1)
    const cell = cells[target]
    if (!cell) return
    cell.focus()
    cell.select()
  }

  /**
   * Раскладывает цифры от указанной ячейки и возвращает, где должен оказаться
   * курсор: на первой незаполненной после вставленного куска.
   */
  function fill(from: number, text: string): number {
    let cursor = from

    for (const char of Array.from(text)) {
      if (cursor >= length) break
      writeDigit(cursor, char)
      cursor += 1
    }

    return cursor
  }

  function setCode(value: string): void {
    digits.value = Array.from({ length }, () => '')
    fill(0, value.replace(NOT_DIGIT, ''))
  }

  const code = computed(() => digits.value.join(''))
  const isComplete = computed(() => digits.value.every((digit) => digit !== ''))

  function focusFirstEmpty(): void {
    const empty = digits.value.findIndex((digit) => digit === '')
    focusCell(empty === -1 ? length - 1 : empty)
  }

  function onInput(index: number, event: Event): void {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return

    const typed = input.value.replace(NOT_DIGIT, '')

    /*
     * Ячейка обязана показывать ровно то, что лежит в модели. Браузер уже
     * вписал в неё свой вариант — две цифры при быстром наборе, букву при
     * другой раскладке, — и если модель после фильтра не изменилась, Vue не
     * станет патчить value: в поле осталась бы буква, которой в коде нет.
     * Поэтому value возвращаем руками, не дожидаясь патча.
     */
    if (typed === '') {
      writeDigit(index, '')
      input.value = ''
      return
    }

    // Больше одной цифры приходит от подстановки кода из СМС и от вставки
    // на тех платформах, где paste до нас не доходит: раскладываем так же.
    const next = fill(index, typed)
    input.value = digitAt(index)
    focusCell(next)
  }

  function onKeydown(index: number, event: KeyboardEvent): void {
    switch (event.key) {
      /*
       * Backspace всегда наш: браузеру стирать нечего, если ячейка пуста, —
       * он бы просто ничего не сделал, и курсор остался бы в пустом поле.
       * Заполненная ячейка чистится на месте, пустая уводит курсор назад
       * и чистит соседа: именно это и имеет в виду человек, стирающий код.
       */
      case 'Backspace':
        event.preventDefault()
        if (digitAt(index) !== '') {
          writeDigit(index, '')
          return
        }
        if (index === 0) return
        writeDigit(index - 1, '')
        focusCell(index - 1)
        return

      case 'Delete':
        event.preventDefault()
        writeDigit(index, '')
        return

      case 'ArrowLeft':
        event.preventDefault()
        focusCell(index - 1)
        return

      case 'ArrowRight':
        event.preventDefault()
        focusCell(index + 1)
        return

      case 'Home':
        event.preventDefault()
        focusCell(0)
        return

      case 'End':
        event.preventDefault()
        focusCell(length - 1)
        return

      default:
        return
    }
  }

  function onPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault()

    const pasted = (event.clipboardData?.getData('text') ?? '').replace(NOT_DIGIT, '')
    if (pasted === '') return

    /*
     * Код целиком кладём с первой ячейки, огрызок — с текущей. Человек,
     * вставляющий шесть цифр в третью ячейку, имеет в виду весь код,
     * а не его хвост: последние четыре цифры просто не поместились бы.
     */
    const start = pasted.length >= length ? 0 : index
    focusCell(fill(start, pasted))
  }

  /** Клик по заполненной ячейке: содержимое выделено, набор поверх заменяет его. */
  function onFocus(event: FocusEvent): void {
    const input = event.target
    if (input instanceof HTMLInputElement) input.select()
  }

  return {
    digits,
    code,
    isComplete,
    setCode,
    setCell,
    onInput,
    onKeydown,
    onPaste,
    onFocus,
    focusFirstEmpty,
  }
}
