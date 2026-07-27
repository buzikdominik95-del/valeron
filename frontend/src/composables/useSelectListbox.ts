import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { onClickOutside, useTimeoutFn } from '@vueuse/core'
import type { VelSelectOption } from '@/types/velora'

/**
 * Поведение выпадающего списка: раскрытие, активный пункт, клавиатура,
 * поиск по первым буквам и закрытие по клику вне.
 *
 * Вынесено из VelSelect.vue отдельным файлом: здесь чистая машина состояний
 * без единого обращения к DOM, поэтому её видно целиком и она переиспользуема
 * любым другим списком. Компоненту остаётся разметка, ARIA и геометрия.
 *
 * Фокус НИКОГДА не уходит с триггера — активный пункт объявляется через
 * aria-activedescendant. Это шаблон комбобокса из ARIA APG: фокус в одном
 * месте, значит после выбора его не нужно ловить и возвращать, а Tab уводит
 * дальше по форме предсказуемо.
 */

/** Сколько живёт набранная строка поиска, прежде чем начать её заново */
const SEARCH_RESET_MS = 700

export interface SelectListboxParams {
  /** Пункты списка. Геттер, а не массив: подписи меняются при смене языка. */
  options: MaybeRefOrGetter<readonly VelSelectOption[]>
  /** Значение контрола — v-model компонента */
  model: Ref<string>
  disabled: MaybeRefOrGetter<boolean>
  /** Корень контрола: клик за его пределами закрывает список */
  root: Ref<HTMLElement | null>
  /** Кнопка-триггер: на неё возвращается фокус после выбора и по Escape */
  trigger: Ref<HTMLElement | null>
}

export interface SelectListbox {
  expanded: Ref<boolean>
  /** Индекс активного пункта, −1 когда список свёрнут */
  activeIndex: Ref<number>
  toggle: () => void
  /** Подсветить пункт под курсором, не выбирая его */
  activate: (index: number) => void
  choose: (index: number) => void
  onTriggerKeydown: (event: KeyboardEvent) => void
}

export function useSelectListbox(params: SelectListboxParams): SelectListbox {
  const expanded = ref(false)
  const activeIndex = ref(-1)
  const search = ref('')

  // Таймер из VueUse: он сам снимается вместе с областью эффектов компонента,
  // голый setTimeout пришлось бы гасить руками в onScopeDispose.
  const { start: restartSearch, stop: stopSearch } = useTimeoutFn(
    () => {
      search.value = ''
    },
    SEARCH_RESET_MS,
    { immediate: false },
  )

  function list(): readonly VelSelectOption[] {
    return toValue(params.options)
  }

  function selectedIndex(): number {
    return list().findIndex((option) => option.value === params.model.value)
  }

  function open(edge: 'first' | 'last'): void {
    if (toValue(params.disabled)) return
    const count = list().length
    // Пустой список раскрывать нечем: пустая рамка под кнопкой выглядит поломкой.
    if (count === 0) return
    const selected = selectedIndex()
    activeIndex.value = selected >= 0 ? selected : edge === 'last' ? count - 1 : 0
    expanded.value = true
  }

  function close(): void {
    expanded.value = false
    activeIndex.value = -1
    search.value = ''
    stopSearch()
  }

  /** Закрыть и вернуть фокус на триггер: иначе он упал бы на <body>. */
  function closeAndFocus(): void {
    close()
    params.trigger.value?.focus()
  }

  function toggle(): void {
    if (expanded.value) closeAndFocus()
    else open('first')
  }

  function activate(index: number): void {
    if (!expanded.value) return
    if (index >= 0 && index < list().length) activeIndex.value = index
  }

  function choose(index: number): void {
    const option = list()[index]
    // Индекс −1 приходит с Enter по свёрнутому списку — выбирать нечего.
    if (!option) return
    params.model.value = option.value
    closeAndFocus()
  }

  /** Шаг по списку с упором в края — как в нативном select, без закольцовки. */
  function move(delta: number): void {
    const count = list().length
    if (count === 0) return
    const from = activeIndex.value >= 0 ? activeIndex.value : delta > 0 ? -1 : count
    activeIndex.value = Math.min(Math.max(from + delta, 0), count - 1)
  }

  function jump(edge: 'first' | 'last'): void {
    const count = list().length
    if (count === 0) return
    activeIndex.value = edge === 'first' ? 0 : count - 1
  }

  /**
   * Поиск по первым буквам. Одна и та же буква подряд перебирает пункты на
   * эту букву, несколько разных — ищут по набранному началу подписи.
   * Значение при этом не меняется: подсветка есть, выбор остаётся за Enter.
   */
  function typeahead(char: string): void {
    const options = list()
    if (options.length === 0) return

    const firstChar = search.value.length === 0
    search.value += char.toLowerCase()
    restartSearch()

    // Первая буква ищет со следующего пункта, продолжение набора — с текущего,
    // иначе «па» после «п» соскакивало бы с уже найденного «Паспорт».
    const from = activeIndex.value < 0 ? 0 : activeIndex.value + (firstChar ? 1 : 0)

    for (let step = 0; step < options.length; step += 1) {
      const index = (from + step) % options.length
      const option = options[index]
      if (option && option.label.toLowerCase().startsWith(search.value)) {
        if (!expanded.value) open('first')
        activeIndex.value = index
        return
      }
    }
  }

  function onTriggerKeydown(event: KeyboardEvent): void {
    if (toValue(params.disabled)) return
    // Ctrl/Cmd — это горячие клавиши браузера, а не навигация по списку.
    if (event.ctrlKey || event.metaKey) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!expanded.value) open('first')
        // Alt+↓ только раскрывает, как в нативном списке.
        else if (!event.altKey) move(1)
        break

      case 'ArrowUp':
        event.preventDefault()
        if (event.altKey) closeAndFocus()
        else if (expanded.value) move(-1)
        else open('last')
        break

      case 'Home':
        event.preventDefault()
        if (!expanded.value) open('first')
        jump('first')
        break

      case 'End':
        event.preventDefault()
        if (!expanded.value) open('last')
        jump('last')
        break

      case 'Enter':
      case ' ':
        // preventDefault обязателен: браузер сам синтезирует из Enter и пробела
        // click по кнопке, и он тут же свернул бы только что раскрытый список.
        // Заодно пробел не проматывает страницу.
        event.preventDefault()
        if (expanded.value) choose(activeIndex.value)
        else open('first')
        break

      case 'Escape':
        if (!expanded.value) break
        event.preventDefault()
        closeAndFocus()
        break

      case 'Tab':
        // Намеренно без preventDefault: фокус обязан уйти дальше по форме.
        if (expanded.value) close()
        break

      default:
        if (event.key.length === 1 && !event.altKey) {
          event.preventDefault()
          typeahead(event.key)
        }
        break
    }
  }

  // Клик вне — из VueUse: слушатель снимается вместе с компонентом,
  // а composedPath корректно отрабатывает клики внутри списка.
  onClickOutside(params.root, () => {
    // Фокус здесь не трогаем: пользователь целился в другое место страницы.
    if (expanded.value) close()
  })

  // Список могли отключить, пока он раскрыт (шаг мастера ждёт другое поле).
  watch(
    () => toValue(params.disabled),
    (isDisabled) => {
      if (isDisabled) close()
    },
  )

  // Смена языка пересобирает пункты: активный индекс мог выйти за границы.
  watch(
    () => list().length,
    (count) => {
      if (activeIndex.value >= count) activeIndex.value = count - 1
    },
  )

  return { expanded, activeIndex, toggle, activate, choose, onTriggerKeydown }
}
