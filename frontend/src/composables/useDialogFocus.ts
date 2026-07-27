import { nextTick, watch } from 'vue'
import type { Ref } from 'vue'
import { tryOnScopeDispose, useEventListener, useScrollLock } from '@vueuse/core'

/**
 * Поведение модального окна: фокус заперт внутри, Escape закрывает, страница
 * под окном не прокручивается, а после закрытия фокус возвращается туда,
 * откуда окно открыли.
 *
 * Вынесено из панели подписи отдельным файлом: это поведение любого модального
 * окна и к подписи отношения не имеет. В @vueuse/core готовой ловушки фокуса
 * нет — useFocusTrap живёт в @vueuse/integrations и тянет за собой пакет
 * focus-trap, которого в проекте нет. Всё остальное здесь собрано из готовых
 * примитивов VueUse: useActiveElement, useEventListener, useScrollLock.
 *
 * Почему клик по подложке НЕ закрывает: в окне подписи это потеря уже
 * нарисованного росчерка от случайного промаха мимо кнопки. Выходы — Escape
 * и кнопка закрытия, оба намеренные.
 */

/**
 * Что умеет принимать фокус. tabindex="-1" исключён намеренно: такие элементы
 * доступны только программно и в обходе по Tab не участвуют.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export interface DialogFocusParams {
  /** Корень окна: всё, что внутри, считается «внутри ловушки». */
  panel: Ref<HTMLElement | null>
  /** Открыто ли окно. */
  open: Ref<boolean>
  /** Escape внутри окна. Закрытие остаётся за вызывающим компонентом. */
  onEscape: () => void
}

export function useDialogFocus(params: DialogFocusParams): void {
  const { panel, open } = params

  /** Элемент, с которого окно открыли: на него уйдёт фокус после закрытия. */
  let opener: HTMLElement | null = null

  /**
   * Видимые элементы в порядке обхода. Скрытые (display: none у поля, которого
   * нет в текущем режиме) обязаны выпасть из списка, иначе Tab упирался бы
   * в невидимую цель. getClientRects надёжнее offsetParent: последний пуст
   * и у нормально видимых элементов с position: fixed.
   */
  function focusable(): HTMLElement[] {
    const root = panel.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.getClientRects().length > 0,
    )
  }

  /** Фокус на первый элемент окна; если таких нет — на само окно (tabindex="-1"). */
  function focusFirst(): void {
    const first = focusable()[0]
    if (first) first.focus()
    else panel.value?.focus()
  }

  useEventListener(panel, 'keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      params.onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const items = focusable()
    const first = items[0]
    const last = items[items.length - 1]
    // Запирать нечего — но и выпускать наружу нельзя.
    if (!first || !last) {
      event.preventDefault()
      return
    }

    const current = document.activeElement
    if (event.shiftKey) {
      if (current === first || current === panel.value) {
        event.preventDefault()
        last.focus()
      }
      return
    }

    if (current === last) {
      event.preventDefault()
      first.focus()
    }
  })

  /*
   * Второй рубеж: Tab — не единственный способ сменить фокус. Клик по странице
   * за окном, поиск по странице, переход из адресной строки — всё это уводит
   * фокус мимо обработчика клавиш. Ловим сам факт прихода фокуса наружу
   * и возвращаем его в окно.
   */
  useEventListener(document, 'focusin', (event) => {
    if (!open.value) return
    const root = panel.value
    if (!root) return
    const target = event.target
    if (target instanceof Node && root.contains(target)) return
    focusFirst()
  })

  // Страница под окном не едет: иначе прокрутка колесом над подложкой
  // проматывает содержимое, к которому сейчас нет доступа.
  const locked = useScrollLock(() => document.body)

  watch(open, async (isOpen, wasOpen) => {
    locked.value = isOpen

    if (isOpen) {
      /*
       * Снимок делаем до отрисовки окна: сейчас в фокусе ещё кнопка-источник.
       * document.activeElement читается напрямую, а не через useActiveElement:
       * тот ведёт значение слушателями focus/blur, а браузер, чьё окно не в
       * фокусе операционной системы, эти события откладывает — в снимок попал
       * бы body, и возвращать фокус оказалось бы некуда.
       */
      const source = document.activeElement
      opener = source instanceof HTMLElement ? source : null
      // Ждём, пока окно появится в DOM, иначе фокусировать нечего.
      await nextTick()
      focusFirst()
      return
    }

    if (!wasOpen) return

    // body в источниках не считаем: в Safari клик по кнопке её не фокусирует,
    // и возвращать «фокус» на body значит просто выкинуть его в начало страницы.
    if (opener && opener.isConnected && opener !== document.body) opener.focus()
    opener = null
  })

  // Окно могли размонтировать открытым — блокировку снимаем за собой.
  tryOnScopeDispose(() => {
    locked.value = false
  })
}
