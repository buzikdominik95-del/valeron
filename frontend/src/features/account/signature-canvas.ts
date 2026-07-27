import { currentBox } from '@/features/account/signature-geometry'
import type { FitBox, Point, Size } from '@/features/account/signature-geometry'

/**
 * Отрисовка канваса подписи.
 *
 * Отдельным модулем, а не внутри useSignaturePad: здесь нет ни одного ref и
 * ни одного слушателя — только вызовы 2d-контекста. Их проверяют чтением и на
 * любом прямоугольнике, не открывая панель, а композаблу остаются состояние,
 * указатель и жизненный цикл (тот же приём, что в hero-canvas-scene).
 *
 * Числа сюда приходят из signature-geometry.ts: подпись хранится долями
 * ОБЛАСТИ ЗАПИСИ, и подгонка под текущую область живёт там. Там же объяснено,
 * почему пересчитывать точки на месте нельзя.
 */

/** Что кладём на холст: росчерк указателем или набранное имя. */
export type SignatureMode = 'draw' | 'type'

/** Толщина линии в CSS-пикселях. */
const LINE_WIDTH = 2.4

/** Кегль имени в режиме ввода: старт сверху, ужимаем до тех пор, пока влезает. */
const TYPED_MAX_SIZE = 64
const TYPED_MIN_SIZE = 18
const TYPED_STEP = 2
/** Поля по бокам при отрисовке имени, доля ширины канваса. */
const TYPED_SIDE_PAD = 0.1

/** Запасное семейство, если CSS-переменная не доехала. Generic-имя, не гарнитура. */
const TYPED_FALLBACK_FAMILY = 'cursive'

/** Всё, что отрисовке нужно знать о подписи прямо сейчас. */
export interface SignatureFrame {
  /** Текущая область в CSS-пикселях. */
  size: Size
  /** Плотность экрана: сколько физических пикселей приходится на CSS-пиксель. */
  ratio: number
  mode: SignatureMode
  /** Набранное имя как есть, из поля: обрезкой пробелов занимается отрисовка. */
  text: string
  /** Штрихи в долях области записи. */
  strokes: readonly Point[][]
  /** Область записи; null — подпись ещё не начата. */
  origin: Size | null
}

/**
 * Значение CSS-переменной с элемента. Цвет чернил и гарнитура подписи живут
 * в токенах темы, а не константами в коде: сырых значений в проекте нет
 * нигде, включая аргументы JS.
 */
function cssValue(element: Element, name: string): string {
  // Перевод строки внутри объявления доезжает сюда как есть, а он попадает
  // в сокращённую запись ctx.font — сжимаем пробелы до одного.
  return getComputedStyle(element).getPropertyValue(name).trim().replace(/\s+/g, ' ')
}

/**
 * Приводит буфер канваса к физическим пикселям экрана.
 *
 * Присваивание width/height обнуляет холст целиком — вместе с содержимым и
 * матрицей преобразования. Поэтому размер трогаем только когда он реально
 * изменился, а рисование всегда идёт следом отдельным вызовом drawSignature.
 */
export function resizeBuffer(element: HTMLCanvasElement, size: Size, ratio: number): void {
  const { width, height } = size
  if (width === 0 || height === 0) return

  const density = ratio || 1
  const nextWidth = Math.round(width * density)
  const nextHeight = Math.round(height * density)

  if (element.width !== nextWidth) element.width = nextWidth
  if (element.height !== nextHeight) element.height = nextHeight
}

/** Имя шрифтом по центру области, кегль подбирается под ширину. */
function drawTypedName(
  ctx: CanvasRenderingContext2D,
  element: HTMLCanvasElement,
  value: string,
  width: number,
  height: number,
): void {
  const text = value.trim()
  if (text === '') return

  const family = cssValue(element, '--vel-signature-family') || TYPED_FALLBACK_FAMILY
  const maxWidth = width * (1 - TYPED_SIDE_PAD * 2)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Половина высоты — верхний предел: иначе длинное имя на низкой области
  // вылезает за дашированную рамку сверху и снизу.
  let fontSize = Math.min(TYPED_MAX_SIZE, height * 0.5)
  for (;;) {
    ctx.font = `italic ${fontSize}px ${family}`
    if (ctx.measureText(text).width <= maxWidth || fontSize <= TYPED_MIN_SIZE) break
    fontSize -= TYPED_STEP
  }

  // Чуть ниже середины: рукописная строка сидит на воображаемой линейке,
  // а не висит по геометрическому центру прямоугольника.
  ctx.fillText(text, width / 2, height * 0.56, maxWidth)
}

/**
 * Штрихи гладкой линией.
 *
 * Через точки не проводим прямых: на быстром росчерке шаг между событиями
 * большой, и подпись превращается в кардиограмму. Классический приём —
 * квадратичная кривая, где сама точка служит контрольной, а концами
 * сегментов берутся середины между соседними точками. Стыки тогда
 * совпадают и по положению, и по касательной, то есть излома не видно.
 */
function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Point[][],
  box: FitBox,
): void {
  ctx.lineWidth = LINE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  /* Доля области записи → CSS-пиксель текущей области. Вся подгонка
     под изменившуюся форму живёт в этих двух строчках и нигде больше. */
  const px = (value: number): number => box.offsetX + value * box.width
  const py = (value: number): number => box.offsetY + value * box.height

  for (const stroke of strokes) {
    const first = stroke[0]
    if (!first) continue

    // Одиночное касание — это точка, а не линия: рисуем кружок,
    // иначе короткий тап не оставляет следа вовсе.
    if (stroke.length === 1) {
      ctx.beginPath()
      ctx.arc(px(first.x), py(first.y), LINE_WIDTH / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }

    ctx.beginPath()
    ctx.moveTo(px(first.x), py(first.y))

    for (let i = 1; i < stroke.length - 1; i += 1) {
      const current = stroke[i]
      const next = stroke[i + 1]
      if (!current || !next) continue
      ctx.quadraticCurveTo(
        px(current.x),
        py(current.y),
        px((current.x + next.x) / 2),
        py((current.y + next.y) / 2),
      )
    }

    // Хвост добираем отрезком: у последней точки нет следующей,
    // а бросать её значило бы обрывать линию на полсегмента раньше.
    const last = stroke[stroke.length - 1]
    if (last) ctx.lineTo(px(last.x), py(last.y))

    ctx.stroke()
  }
}

/**
 * Полная перерисовка. Она же обслуживает и смену размера, и каждый кадр
 * рисования: подпись — это порядок тысячи сегментов, канвас проходит их
 * быстрее, чем приходит следующее событие указателя, зато результат
 * гарантированно один и тот же после любого события.
 */
export function drawSignature(element: HTMLCanvasElement, frame: SignatureFrame): void {
  const ctx = element.getContext('2d')
  if (!ctx) return

  const { width, height } = frame.size
  if (width === 0 || height === 0) return

  const ratio = frame.ratio || 1
  // Матрица ставится заново каждый раз: смена размера буфера её сбрасывает.
  // После неё все координаты внутри — CSS-пиксели, ретина учтена сама собой.
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const ink = cssValue(element, '--color-accent-deep')
  // Пустое значение оставляем как есть: цвет по умолчанию у канваса свой,
  // и подменять его сырым значением из кода нельзя.
  if (ink !== '') {
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
  }

  if (frame.mode === 'type') drawTypedName(ctx, element, frame.text, width, height)
  else {
    const box = currentBox(frame.origin, frame.size)
    if (box) drawStrokes(ctx, frame.strokes, box)
  }
}
