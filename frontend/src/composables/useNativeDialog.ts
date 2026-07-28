import { watch } from 'vue'
import type { Ref } from 'vue'
import { tryOnScopeDispose, useEventListener, useScrollLock } from '@vueuse/core'

/**
 * Модальное окно на нативном <dialog> с showModal().
 *
 * ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ useDialogFocus. Тот композабл собирает поведение окна
 * руками — ловушку фокуса, Escape, возврат фокуса — потому что панель подписи
 * нарисована обычным <div> и другого выхода у неё нет. Здесь всё это делает
 * браузер, и повторять его работу нельзя: две ловушки фокуса дерутся за одно и
 * то же событие Tab.
 *
 * Что даёт сам <dialog>, открытый через showModal():
 *   — фокус заперт внутри окна;
 *   — Escape закрывает и шлёт событие close;
 *   — всё под окном инертно: не кликается и не читается скринридером;
 *   — окно уходит в top layer, поэтому его не обрезает overflow и не сдвигает
 *     transform у предка — Teleport ему не нужен;
 *   — фокус возвращается на элемент, с которого окно открыли.
 *
 * Здесь остаётся ровно то, чего он НЕ делает:
 *   1. Связь с моделью в обе стороны. Флаг → showModal/close, и обратно:
 *      Escape закрывает окно мимо модели, и без подписки на close флаг остался
 *      бы поднятым — окно больше не открылось бы, потому что менять нечего.
 *   2. Замок прокрутки. Колесо над подложкой продолжает мотать документ:
 *      единственное, что приходится добирать из VueUse.
 *   3. Анимация закрытия: close() снимает [open] мгновенно. Перед close()
 *      вешаем класс vel-dialog-out (глобальные keyframes в main.css) и ждём
 *      animationend — иначе все модалки «моргают» без leave.
 *
 * @param dialog ссылка на элемент <dialog>
 * @param open   модель «окно открыто»
 */

/** Длительность leave — синхрон с --vel-dialog-out-ms / main.css */
const DIALOG_OUT_MS = 220

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function closeWithAnimation(element: HTMLDialogElement): void {
  if (!element.open) return
  if (element.dataset.velClosing === '1') return

  if (prefersReducedMotion()) {
    element.close()
    return
  }

  element.dataset.velClosing = '1'
  element.classList.add('vel-dialog-out')

  let finished = false
  const finish = (): void => {
    if (finished) return
    finished = true
    element.removeEventListener('animationend', onAnimEnd)
    element.classList.remove('vel-dialog-out')
    delete element.dataset.velClosing
    if (element.open) element.close()
  }

  const onAnimEnd = (event: AnimationEvent): void => {
    /* Только анимация самого dialog, не дочерних (text/border-beam). */
    if (event.target !== element) return
    finish()
  }

  element.addEventListener('animationend', onAnimEnd)
  window.setTimeout(finish, DIALOG_OUT_MS + 80)
}

export function useNativeDialog(
  dialog: Readonly<Ref<HTMLDialogElement | null>>,
  open: Ref<boolean>,
  /**
   * Нельзя закрыть (Escape / close / open=false). Для финала Telegram:
   * только CTA внутри окна.
   */
  options?: { persistent?: Readonly<Ref<boolean>> | boolean },
): void {
  function isPersistent(): boolean {
    const p = options?.persistent
    if (p === undefined) return false
    return typeof p === 'boolean' ? p : p.value
  }

  /*
   * В источниках не только флаг, но и сам элемент: при монтировании с
   * open === true флага бы не хватило — он не менялся, и showModal() никто
   * бы не позвал.
   */
  watch(
    [open, dialog],
    ([isOpen, element]) => {
      if (!element) return

      if (isOpen) {
        element.classList.remove('vel-dialog-out')
        delete element.dataset.velClosing
        // Повторный showModal() на открытом окне — исключение InvalidStateError.
        if (!element.open) element.showModal()
        return
      }

      /* persistent: open=false игнорируем и снова showModal */
      if (isPersistent()) {
        if (!element.open) element.showModal()
        open.value = true
        return
      }

      if (element.open) closeWithAnimation(element)
    },
    { flush: 'post' },
  )

  /*
   * Escape: preventDefault, чтобы dialog не close() мгновенно —
   * спускаем open=false → watch → leave-анимация → close().
   * persistent: Escape не закрывает.
   */
  useEventListener(
    () => dialog.value,
    'cancel',
    (event) => {
      event.preventDefault()
      if (isPersistent()) return
      if (open.value) open.value = false
    },
  )

  // close() после анимации (или native) — опускаем флаг модели.
  useEventListener(
    () => dialog.value,
    'close',
    () => {
      if (isPersistent()) {
        open.value = true
        const el = dialog.value
        if (el && !el.open) el.showModal()
        return
      }
      open.value = false
    },
  )

  const locked = useScrollLock(() => document.body)

  watch(open, (isOpen) => {
    locked.value = isOpen
  })

  // Окно могли размонтировать открытым — замок снимаем за собой.
  tryOnScopeDispose(() => {
    locked.value = false
    const el = dialog.value
    if (el?.open) el.close()
  })
}
