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
 *
 * @param dialog ссылка на элемент <dialog>
 * @param open   модель «окно открыто»
 */
export function useNativeDialog(dialog: Readonly<Ref<HTMLDialogElement | null>>, open: Ref<boolean>): void {
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
        // Повторный showModal() на открытом окне — исключение InvalidStateError.
        if (!element.open) element.showModal()
        return
      }

      if (element.open) element.close()
    },
    { flush: 'post' },
  )

  // Escape и любой вызов close() закрывают окно мимо модели — опускаем флаг.
  useEventListener(
    () => dialog.value,
    'close',
    () => {
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
  })
}
