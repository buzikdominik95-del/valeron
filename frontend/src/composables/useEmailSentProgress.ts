import { onScopeDispose, readonly, ref } from 'vue'
import type { DeepReadonly, Ref } from 'vue'
import { fastAnimMs } from '@/lib/fast-anim'

/**
 * Автоматический проход экрана «письмо отправлено»: письмо → проверка адреса →
 * готово, и переход в кабинет сам, без нажатия.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ КОМПОНЕНТА. Здесь сходятся три вещи, каждая из которых
 * ломается молча: фазы обязаны идти по порядку и ровно один раз, таймер обязан
 * умереть вместе с экраном, а последний шаг обязан сработать один раз, а не на
 * каждый тик. В шаблоне рядом с разметкой любая из трёх теряется при первой же
 * правке вёрстки — это ровно тот случай, что описан у useDocumentUpload.
 *
 * ПОЧЕМУ ЦЕПОЧКА setTimeout, А НЕ ОДИН setInterval. Интервал продолжает тикать
 * после последней фазы, и его пришлось бы гасить условием внутри колбэка —
 * то есть держать в голове, что «лишний тик» существует. Цепочка планирует
 * ровно следующий шаг и на последнем не планирует ничего.
 *
 * ГРАНИЦА. Ни одна фаза здесь ничего не проверяет: сервера нет, письма нет,
 * и «Verifica dell’indirizzo» — это подпись к ожиданию, а не результат.
 * Поэтому же длительности сжимаются флагом ?fastAnim=1, как и все прочие
 * ожидания проекта.
 */

/** Сколько держится каждая фаза. Последняя короче: на ней уже видно, что
    экран уходит, и задерживать человека на готовом результате незачем. */
const PHASE_MS = [2200, 2600, 1200] as const

export interface EmailSentProgress {
  /** Номер текущей фазы, с единицы: его же показывает индикатор сегментов. */
  current: DeepReadonly<Ref<number>>
  /** Всего фаз. Константа — длина таблицы длительностей. */
  total: number
  /** Ключ подписи текущей фазы: account.emailSent.phases.<key>. */
  phaseKey: DeepReadonly<Ref<'sending' | 'checking' | 'ready'>>
}

const PHASE_KEYS = ['sending', 'checking', 'ready'] as const

/**
 * @param done вызывается один раз, когда прошла последняя фаза.
 */
export function useEmailSentProgress(done: () => void): EmailSentProgress {
  const current = ref(1)
  const phaseKey = ref<(typeof PHASE_KEYS)[number]>(PHASE_KEYS[0])

  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule(index: number): void {
    /*
     * Длительность спрашивается в момент планирования, а не считается разом на
     * всю цепочку: флаг ускорения живёт в адресной строке, и таблица, посчитанная
     * при загрузке модуля, не пережила бы смену адреса без перезагрузки.
     */
    timer = setTimeout(() => {
      const next = index + 1

      if (next >= PHASE_MS.length) {
        // Последняя фаза отыграла: уводим экран и НИЧЕГО больше не планируем.
        done()
        return
      }

      current.value = next + 1
      /* Запасной ключ задан литералом, а не PHASE_KEYS[len-1]: при
         noUncheckedIndexedAccess индекс тоже даёт union с undefined, и проверка
         типов на нём не сходится. Ветка недостижима — next < PHASE_MS.length,
         а таблицы одной длины, — но запасное значение обязано быть точным. */
      phaseKey.value = PHASE_KEYS[next] ?? 'ready'
      schedule(next)
    }, fastAnimMs(PHASE_MS[index] ?? 0))
  }

  schedule(0)

  /* Свой владелец у setTimeout отсутствует, а композабл может пережить
     размонтирование, если его подняли выше по дереву. */
  onScopeDispose(() => {
    if (timer !== undefined) clearTimeout(timer)
  })

  return {
    current: readonly(current),
    total: PHASE_MS.length,
    phaseKey: readonly(phaseKey),
  }
}
