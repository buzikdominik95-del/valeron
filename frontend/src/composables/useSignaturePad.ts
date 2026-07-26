import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useDevicePixelRatio, useEventListener, useResizeObserver } from '@vueuse/core'
import { drawSignature, resizeBuffer } from '@/features/account/signature-canvas'
import type { SignatureMode } from '@/features/account/signature-canvas'
import { currentBox, isTooClose, toPoint } from '@/features/account/signature-geometry'
import type { Point, Size } from '@/features/account/signature-geometry'

/**
 * Канвас подписи: рисование указателем и отрисовка имени шрифтом.
 *
 * Почему один канвас на два режима. Наружу панель обязана отдать PNG, значит
 * набранное имя всё равно придётся положить на канвас. Второй холст ради этого
 * означал бы вторую копию всей возни с devicePixelRatio, ResizeObserver и
 * toDataURL — вместо этого режим просто выбирает, что рисовать.
 *
 * Здесь держатся состояние, указатель и жизненный цикл; геометрия вынесена
 * в signature-geometry.ts, отрисовка — в signature-canvas.ts. В первом же
 * объяснено, почему точки хранятся долями ОБЛАСТИ ЗАПИСИ и подгоняются под
 * текущую только в момент рисования, а не пересчитываются на месте: пересчёт
 * необратим, и подпись от него навсегда усыхала на каждом повороте телефона.
 *
 * Указатель обрабатывается ТОЛЬКО pointer-событиями: одна ветка на мышь,
 * палец и стилус. setPointerCapture уводит все последующие move/up на канвас,
 * поэтому линия не обрывается, когда рука вышла за пределы области.
 */

/**
 * Тип режима объявлен рядом с отрисовкой — она и решает, что класть на холст, —
 * но наружу выдаётся отсюда: панель берёт его тем же импортом, что и сам
 * композабл, и ломать этот путь ради переезда одного типа не за что.
 */
export type { SignatureMode }

export interface SignaturePadParams {
  /** Элемент канваса; появляется позже — панель живёт под v-if. */
  canvas: Ref<HTMLCanvasElement | null>
  /** Текущий способ подписи. Ref, а не геттер: на него смотрит и разметка. */
  mode: Ref<SignatureMode>
  /** Имя для режима ввода — v-model поля. */
  typedName: Ref<string>
}

export interface SignaturePad {
  /** Подписывать нечего: ни штрихов, ни имени — смотря по режиму. */
  isEmpty: ComputedRef<boolean>
  /** Указатель прижат и ведёт линию прямо сейчас. */
  isDrawing: Ref<boolean>
  /** Снимает и штрихи, и набранное имя: «Cancella» отменяет подпись целиком. */
  clear: () => void
  /** PNG в виде dataURL; null, когда подписывать нечего. */
  toDataUrl: () => string | null
}

export function useSignaturePad(params: SignaturePadParams): SignaturePad {
  const { canvas, mode, typedName } = params

  /*
   * Штрихи намеренно вне реактивности: подпись — это тысячи точек, и на каждую
   * Vue завёл бы прокси, а любой push дёргал бы зависимости посреди рисования.
   * Для интерфейса достаточно счётчика штрихов, он и объявлен ref.
   */
  let strokes: Point[][] = []
  const strokeCount = ref(0)

  /**
   * Область, в долях которой записаны точки. Ставится с первым штрихом и
   * дальше НЕ МЕНЯЕТСЯ, пока подпись не стёрли: это и есть тот источник,
   * который нельзя портить. Пока штрихов нет, держим null — тогда подпись
   * начнётся в той области, что есть сейчас, и подгонять будет нечего.
   */
  let origin: Size | null = null

  const isDrawing = ref(false)
  /** id ведущего указателя: второй палец не должен дорисовывать чужую линию. */
  let activePointer: number | null = null

  /** Размер области в CSS-пикселях; поставляет ResizeObserver. */
  const size = ref<Size>({ width: 0, height: 0 })
  const { pixelRatio } = useDevicePixelRatio()

  const isEmpty = computed(() =>
    mode.value === 'type' ? typedName.value.trim() === '' : strokeCount.value === 0,
  )

  /** Снимок состояния на холст. Зовётся после каждого события — см. drawSignature. */
  function render(): void {
    const element = canvas.value
    if (!element) return

    drawSignature(element, {
      size: size.value,
      ratio: pixelRatio.value,
      mode: mode.value,
      text: typedName.value,
      strokes,
      origin,
    })
  }

  useEventListener(canvas, 'pointerdown', (event) => {
    // В режиме ввода канвас — предпросмотр. Разметка ещё и гасит на нём
    // pointer-events, но состояние должно держаться и без CSS.
    if (mode.value !== 'draw') return
    // Второй палец во время росчерка игнорируем: рисует тот, кто начал.
    if (!event.isPrimary || isDrawing.value) return

    /*
     * Область записи фиксируется ПЕРВЫМ штрихом и держится до «Cancella».
     * До него подпись ещё не начата, и повороты экрана можно принимать
     * без всяких последствий — просто начнём в той области, что застали.
     */
    if (strokes.length === 0) {
      const { width, height } = size.value
      if (width === 0 || height === 0) return
      origin = { width, height }
    }

    const element = canvas.value
    const box = currentBox(origin, size.value)
    if (!element || !box) return

    const point = toPoint(element, event, box)
    if (!point) return

    // Гасим выделение текста и «перетаскивание» области мышью.
    event.preventDefault()

    // Захват указателя: move и up после него приходят сюда даже за пределами
    // канваса, поэтому линия не обрывается на краю области. Бросает
    // NotFoundError, если указатель успел исчезнуть между событием и вызовом —
    // рисовать это не мешает, линия просто оборвётся на краю.
    try {
      element.setPointerCapture(event.pointerId)
    } catch {
      /* захват не обязателен */
    }

    activePointer = event.pointerId
    isDrawing.value = true
    strokes.push([point])
    strokeCount.value = strokes.length
    render()
  })

  useEventListener(canvas, 'pointermove', (event) => {
    if (!isDrawing.value || event.pointerId !== activePointer) return

    const stroke = strokes[strokes.length - 1]
    if (!stroke) return

    /*
     * getCoalescedEvents отдаёт промежуточные положения, которые браузер
     * склеил в одно событие. На экране со 120 Гц их по несколько на кадр, и
     * без них быстрый росчерк срезает углы. Пустой список возвращают старые
     * движки — тогда работаем с самим событием.
     */
    const coalesced = event.getCoalescedEvents()
    const batch = coalesced.length > 0 ? coalesced : [event]

    // Подгонка одна на всю пачку: внутри одного события область не меняется.
    const element = canvas.value
    const box = currentBox(origin, size.value)
    if (!element || !box) return

    let added = false
    for (const item of batch) {
      const point = toPoint(element, item, box)
      if (!point) continue
      const previous = stroke[stroke.length - 1]
      if (previous && isTooClose(previous, point, box)) continue
      stroke.push(point)
      added = true
    }

    if (added) render()
  })

  function finish(event: PointerEvent): void {
    if (event.pointerId !== activePointer) return
    isDrawing.value = false
    activePointer = null
  }

  /*
   * Конец штриха слушаем НА ОКНЕ, а не на канвасе.
   *
   * Захват указателя не гарантирован: setPointerCapture бросает NotFoundError,
   * если указатель успел исчезнуть между событием и вызовом, и тогда отпускание
   * кнопки за пределами канваса до канваса не доходит вовсе. Штрих остаётся
   * «в работе» навсегда, и это видно сразу: рамка горит акцентом, как во время
   * рисования, а следующее нажатие новую линию не начинает — pointerdown
   * отсеивается проверкой isDrawing, зато движения дописываются в прошлый штрих,
   * и через всю подпись протягивается прямая-перемычка.
   *
   * Окно ловит отпускание в любой точке экрана, поэтому такого состояния
   * не остаётся. Чужие указатели отсеивает сам finish — он сверяет pointerId.
   */
  useEventListener(window, 'pointerup', finish)
  useEventListener(window, 'pointercancel', finish)
  // Захват может отобрать система (жест «назад», контекстное меню) —
  // без этого штрих остался бы «в работе» навсегда.
  useEventListener(canvas, 'lostpointercapture', finish)

  useResizeObserver(canvas, (entries) => {
    const entry = entries[0]
    if (!entry) return
    const box = entry.contentRect
    // Новый объект, а не правка полей: watch сравнивает ссылки и должен
    // сработать даже при возврате к прежним числам после повторного открытия.
    size.value = { width: box.width, height: box.height }
  })

  /*
   * Первый замер снимаем сами, не дожидаясь наблюдателя. ResizeObserver отдаёт
   * размер только на следующем проходе разметки, и первый кадр канвас встретил
   * бы с буфером 300×150 по умолчанию — то есть видимой ступенькой. Дальше
   * размер ведёт наблюдатель, здесь только старт.
   */
  watch(
    canvas,
    (element) => {
      if (!element) return
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      size.value = { width: rect.width, height: rect.height }
    },
    { flush: 'post' },
  )

  // Размер или плотность экрана изменились — пересобираем буфер и ОБЯЗАТЕЛЬНО
  // рисуем заново: смена width обнуляет холст, штрихи иначе пропали бы.
  // Сами точки при этом НЕ ТРОГАЕМ: подгонка под новую форму области —
  // работа отрисовки, см. currentBox. Здесь только буфер и перерисовка.
  watch(
    [size, pixelRatio],
    () => {
      const element = canvas.value
      if (element) resizeBuffer(element, size.value, pixelRatio.value)
      render()
    },
    { flush: 'post' },
  )

  // Режим и набранное имя меняют картинку, но не размер.
  watch([mode, typedName], render, { flush: 'post' })

  function clear(): void {
    strokes = []
    strokeCount.value = 0
    // Подписи больше нет — значит нет и области, к которой её привязывали.
    // Следующая начнётся в текущей, а не в той, что была когда-то.
    origin = null
    typedName.value = ''
    isDrawing.value = false
    activePointer = null
    render()
  }

  function toDataUrl(): string | null {
    const element = canvas.value
    if (!element || isEmpty.value) return null
    return element.toDataURL('image/png')
  }

  return { isEmpty, isDrawing, clear, toDataUrl }
}
