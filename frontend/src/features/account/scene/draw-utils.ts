/**
 * Мелкий инструмент отрисовки: интерполяция, кривые разгона, пути, текст.
 *
 * Все функции принимают ctx первым аргументом — в эталоне контекст был
 * глобальным, здесь его нет, и это единственное отличие подписей от эталонных.
 * Имена и числа сохранены.
 */

import type { RgbTriple } from '@/features/account/scene/transfer-palette'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Кубическое замедление: быстрый вход, мягкая остановка. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Разгон и торможение — по нему идут монеты вдоль дуги. */
export function easeIO(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Перелёт с возвратом: подъём узлов, всплеск значка, раскрытие кошелька.
    1.70158 — стандартный коэффициент back-разгона, менять его нельзя:
    от него зависит величина перелёта, а её владелец продукта уже принял. */
export function easeBack(t: number): number {
  const c = 1.70158 + 1
  return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)
}

/**
 * Значение между v0 и v1 по номеру кадра. Эталонная I(): вся раскадровка
 * выражена через неё, поэтому поведение на краях сохранено буквально —
 * до f0 отдаёт v0, после f1 отдаёт v1, при f1 === f0 переключается ступенькой.
 */
export function interp(
  f: number,
  f0: number,
  f1: number,
  v0: number,
  v1: number,
  ease?: (t: number) => number,
): number {
  if (f1 === f0) return f < f0 ? v0 : v1
  let t = clamp((f - f0) / (f1 - f0), 0, 1)
  if (ease) t = ease(t)
  return v0 + (v1 - v0) * t
}

/**
 * Псевдослучайное число из индекса, 0…1. Детерминированный шум: искры при
 * попадании монеты обязаны разлетаться одинаково на каждом обороте цикла,
 * иначе кадр перестаёт быть воспроизводимым, а Math.random() ещё и мешал бы
 * сравнивать вид с эталоном.
 */
export function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Скруглённый прямоугольник в путь (эталонная rr). */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Окружность в путь (эталонная circ). */
export function circlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

/** Полный оборот для arc/ellipse. В эталоне на его месте стоит 7 — число
    больше 2π работает так же, но читается как опечатка. */
export const FULL = Math.PI * 2

export type TextAlign = 'left' | 'center' | 'right'

/** Сокращённая запись ctx.font. Веса эталона bold/normal переведены в числа:
    вариативный Inter отдаёт по имени только 400, а 'bold' синтезирует. */
function fontOf(size: number, weight: number, family: string): string {
  return `${weight} ${size}px ${family}`
}

export const WEIGHT_BOLD = 700
export const WEIGHT_NORMAL = 400

/** Текст (эталонная txt). Базовая линия alphabetic, как в эталоне: все y
    подписей отмерены от неё, и смена на middle сдвинула бы весь слой. */
export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  family: string,
  align: TextAlign = 'left',
): void {
  ctx.save()
  ctx.font = fontOf(size, weight, family)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(value, x, y)
  ctx.restore()
}

/** Ширина строки (эталонная tw). Ею меряются чипы, плашка «+сумма» и сдвиги
    подписей шагов, поэтому смена гарнитуры раскладку не ломает: она считается. */
export function textWidth(
  ctx: CanvasRenderingContext2D,
  value: string,
  size: number,
  weight: number,
  family: string,
): number {
  ctx.save()
  ctx.font = fontOf(size, weight, family)
  const width = ctx.measureText(value).width
  ctx.restore()
  return width
}

/**
 * Текст с разрядкой — поглифовая раскладка вручную.
 *
 * ПОЧЕМУ НЕ ctx.letterSpacing. Свойство поддержано не всюду и в старых WebKit
 * игнорируется МОЛЧА. У эталона разрядка несёт вид в двух местах: «BANCA» на
 * антаблементе (0.32em) и надпись над суммой (0.16em). Без неё «BANCA»
 * схлопывается в комок посреди широкой плиты — потеря заметная, а ручное
 * продвижение работает везде одинаково и стоит десяти строк.
 */
export function trackedText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  family: string,
  /** Разрядка в долях кегля, как em в эталоне. */
  tracking: number,
  align: TextAlign = 'left',
): void {
  const step = size * tracking
  const glyphs = [...value]

  ctx.save()
  ctx.font = fontOf(size, weight, family)
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // Полная ширина = сумма глифов плюс промежутки МЕЖДУ ними. Хвостового
  // промежутка нет: с ним строка по центру уехала бы влево на половину шага.
  let total = 0
  for (const glyph of glyphs) total += ctx.measureText(glyph).width
  total += step * Math.max(0, glyphs.length - 1)

  let cursor = x
  if (align === 'center') cursor = x - total / 2
  else if (align === 'right') cursor = x - total

  for (const glyph of glyphs) {
    ctx.fillText(glyph, cursor, y)
    cursor += ctx.measureText(glyph).width + step
  }
  ctx.restore()
}

/** Ширина строки с разрядкой — под замеры раскладки. */
export function trackedWidth(
  ctx: CanvasRenderingContext2D,
  value: string,
  size: number,
  weight: number,
  family: string,
  tracking: number,
): number {
  ctx.save()
  ctx.font = fontOf(size, weight, family)
  const glyphs = [...value]
  let total = 0
  for (const glyph of glyphs) total += ctx.measureText(glyph).width
  ctx.restore()
  return total + size * tracking * Math.max(0, glyphs.length - 1)
}

/** rgba() из тройки каналов палитры. */
export function rgba(channels: RgbTriple, alpha: number): string {
  return `rgba(${channels}, ${alpha})`
}

/**
 * Мягкая тень под узлом: радиальный градиент, гаснущий к краю. Прозрачность
 * идёт снаружи, чтобы тень появлялась вместе со своим узлом.
 */
export function shadowEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
  channels: RgbTriple,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx)
  g.addColorStop(0, rgba(channels, 0.28))
  g.addColorStop(1, rgba(channels, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, FULL)
  ctx.fill()
  ctx.restore()
}
