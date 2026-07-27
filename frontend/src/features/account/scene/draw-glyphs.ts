/**
 * Значки сцены. Каждый рисуется по центру (x, y) в габарите s, обводкой или
 * заливкой ТЕКУЩЕГО стиля контекста: цвет, толщину и торцы линии ставит
 * зовущий, потому что один и тот же значок появляется и белым на бренде,
 * и приглушённым в подписи узла.
 *
 * Числа с множителем k = s / 24 — это координаты 24-пиксельной сетки значков
 * эталона. Отдельным файлом, потому что значки зовут три разных слоя разом:
 * хаб (щит, молния, глобус), человек (галочка в значке «проверено») и
 * интерфейсный слой (все десять). В draw-utils они раздули бы его вдвое,
 * а в draw-overlay заставили бы хаб импортировать интерфейсный слой.
 */

import { FULL } from '@/features/account/scene/draw-utils'

/** Подпись любого значка: контекст, центр, габарит. */
export type Glyph = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void

/** Щит с галочкой — «защищено». */
export const gShield: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x, y - 9.1 * k)
  ctx.lineTo(x + 8 * k, y - 6.3 * k)
  ctx.lineTo(x + 8 * k, y - 0.2 * k)
  ctx.bezierCurveTo(x + 8 * k, y + 4.8 * k, x + 4.4 * k, y + 8.1 * k, x, y + 9.2 * k)
  ctx.bezierCurveTo(x - 4.4 * k, y + 8.1 * k, x - 8 * k, y + 4.8 * k, x - 8 * k, y - 0.2 * k)
  ctx.lineTo(x - 8 * k, y - 6.3 * k)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 3.3 * k, y + 0.2 * k)
  ctx.lineTo(x - 0.8 * k, y + 2.7 * k)
  ctx.lineTo(x + 3.5 * k, y - 2.1 * k)
  ctx.stroke()
}

/** Молния — «мгновенно». Единственный залитый значок набора. */
export const gBolt: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x + 1.6 * k, y - 9.4 * k)
  ctx.lineTo(x - 6.7 * k, y + 1.5 * k)
  ctx.lineTo(x - 1.5 * k, y + 1.5 * k)
  ctx.lineTo(x - 2.5 * k, y + 9.4 * k)
  ctx.lineTo(x + 5.7 * k, y - 1.4 * k)
  ctx.lineTo(x + 0.5 * k, y - 1.4 * k)
  ctx.closePath()
  ctx.fill()
}

/** Глобус — «международный». */
export const gGlobe: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.arc(x, y, 8.9 * k, 0, FULL)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 8.5 * k, y - 2.4 * k)
  ctx.lineTo(x + 8.5 * k, y - 2.4 * k)
  ctx.moveTo(x - 8.5 * k, y + 2.4 * k)
  ctx.lineTo(x + 8.5 * k, y + 2.4 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(x, y, 3.8 * k, 8.9 * k, 0, 0, FULL)
  ctx.stroke()
}

/** Замок — «шифрование». */
export const gLock: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.roundRect(x - 7.4 * k, y - 1.6 * k, 14.8 * k, 10.6 * k, 2.6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - 1.9 * k, 3.7 * k, Math.PI, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y + 2.6 * k)
  ctx.lineTo(x, y + 5.2 * k)
  ctx.stroke()
}

/** Чек с зубчатым низом — «квитанция PDF». */
export const gReceipt: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 5.8 * k, y - 9 * k)
  ctx.lineTo(x + 5.8 * k, y - 9 * k)
  ctx.lineTo(x + 5.8 * k, y + 9 * k)
  ctx.lineTo(x + 2.9 * k, y + 7.2 * k)
  ctx.lineTo(x, y + 9 * k)
  ctx.lineTo(x - 2.9 * k, y + 7.2 * k)
  ctx.lineTo(x - 5.8 * k, y + 9 * k)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 2.6 * k, y - 3.6 * k)
  ctx.lineTo(x + 2.6 * k, y - 3.6 * k)
  ctx.moveTo(x - 2.6 * k, y + 0.4 * k)
  ctx.lineTo(x + 2.6 * k, y + 0.4 * k)
  ctx.stroke()
}

/** Часы — «осталось примерно». */
export const gClock: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.arc(x, y, 8.9 * k, 0, FULL)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - 4.8 * k)
  ctx.lineTo(x, y)
  ctx.lineTo(x + 3.4 * k, y + 2.2 * k)
  ctx.stroke()
}

/** Банк в миниатюре — шаг «списано». */
export const gBankMini: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 8.4 * k, y - 2.6 * k)
  ctx.lineTo(x, y - 7.8 * k)
  ctx.lineTo(x + 8.4 * k, y - 2.6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 9.2 * k, y + 8.4 * k)
  ctx.lineTo(x + 9.2 * k, y + 8.4 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 5.6 * k, y)
  ctx.lineTo(x - 5.6 * k, y + 6 * k)
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + 6 * k)
  ctx.moveTo(x + 5.6 * k, y)
  ctx.lineTo(x + 5.6 * k, y + 6 * k)
  ctx.stroke()
}

/** Человек в миниатюре — шаг «зачислено». */
export const gUserMini: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.arc(x, y - 3.4 * k, 3.9 * k, 0, FULL)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 7.2 * k, y + 8 * k)
  ctx.bezierCurveTo(x - 7.2 * k, y + 1.8 * k, x + 7.2 * k, y + 1.8 * k, x + 7.2 * k, y + 8 * k)
  ctx.stroke()
}

/** Галочка — значок «проверено» у головы и зажжённый шаг. */
export const gCheck: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 6.5 * k, y + 0.6 * k)
  ctx.lineTo(x - 2 * k, y + 5.2 * k)
  ctx.lineTo(x + 6.8 * k, y - 4.6 * k)
  ctx.stroke()
}

/** Банковская карта — подпись узла «банк». */
export const gCard: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.roundRect(x - 9.4 * k, y - 6.4 * k, 18.8 * k, 12.8 * k, 2.6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 9.4 * k, y - 2 * k)
  ctx.lineTo(x + 9.4 * k, y - 2 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 6 * k, y + 2.4 * k)
  ctx.lineTo(x - 2.6 * k, y + 2.4 * k)
  ctx.stroke()
}

/**
 * Восклицательный знак — состояние отказа вместо галочки.
 *
 * В эталоне его нет: там сцена знает только успех. Добавлен потому, что
 * яркостной контраст success к danger около 1.5, и одним цветом состояние
 * передавать нельзя (WCAG 1.4.1). Пропорции взяты от той же сетки 24.
 */
export const gBang: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x, y - 6.6 * k)
  ctx.lineTo(x, y + 1.4 * k)
  ctx.stroke()
  // Точка залитая: обводкой в этом габарите она выходит кольцом.
  ctx.beginPath()
  ctx.arc(x, y + 5.6 * k, ctx.lineWidth * 0.62, 0, FULL)
  ctx.fill()
}

/**
 * Прочерк — незажжённый третий шаг при отказе. Пустой кружок читался бы как
 * «ещё не дошли», а перевод уже не дойдёт: прочерк говорит «не будет».
 */
export const gDash: Glyph = (ctx, x, y, s) => {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 6.4 * k, y)
  ctx.lineTo(x + 6.4 * k, y)
  ctx.stroke()
}

/**
 * Скруглённый треугольник — подложка значка при отказе вместо круга.
 * Силуэт виден мгновенно и до того, как глаз различил цвет.
 *
 * Рисует ТОЛЬКО путь: заливку и обводку кладёт зовущий, ему нужны обе.
 */
export function warningTrianglePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  // Скругление вершин в 0.22 радиуса: меньше даёт колючую фигуру, больше
  // подтягивает силуэт обратно к кругу и смысл смены формы теряется.
  const round = r * 0.22
  const points: readonly [number, number][] = [
    [x, y - r],
    [x + r * 0.9, y + r * 0.62],
    [x - r * 0.9, y + r * 0.62],
  ]
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    const previous = points[(i + points.length - 1) % points.length]
    if (!current || !next || !previous) continue

    const toPrev = normalize(previous[0] - current[0], previous[1] - current[1])
    const toNext = normalize(next[0] - current[0], next[1] - current[1])
    const startX = current[0] + toPrev.x * round
    const startY = current[1] + toPrev.y * round
    const endX = current[0] + toNext.x * round
    const endY = current[1] + toNext.y * round

    if (i === 0) ctx.moveTo(startX, startY)
    else ctx.lineTo(startX, startY)
    ctx.quadraticCurveTo(current[0], current[1], endX, endY)
  }
  ctx.closePath()
}

function normalize(dx: number, dy: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}
