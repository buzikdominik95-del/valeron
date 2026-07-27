/**
 * Здание банка и вылетающая из него карта.
 *
 * Два экспорта, а не один: карта принадлежит такту банка по смыслу, но лежит
 * в кадре ПОВЕРХ него и должна рисоваться отдельным вызовом — порядок слоёв
 * задаёт только сборщик кадра.
 *
 * Все координаты внутри — относительно опорной точки BANK, как в эталоне:
 * translate сделан один раз, поэтому числа читаются как «от центра фасада».
 */

import { BANK, T } from '@/features/account/scene/transfer-timeline'
import {
  FULL,
  circlePath,
  easeBack,
  easeIO,
  easeOut,
  clamp,
  interp,
  rgba,
  roundRectPath,
  shadowEllipse,
  trackedText,
  WEIGHT_BOLD,
} from '@/features/account/scene/draw-utils'
import { CARD } from '@/features/account/scene/transfer-timeline'
import type { ScenePalette, SceneBrandShades } from '@/features/account/scene/transfer-palette'
import { ILLUSTRATION } from '@/features/account/scene/transfer-palette'

export function drawBank(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  /** Надпись на антаблементе — из локали, литерала в коде нет. */
  sign: string,
): void {
  const app = interp(f, T.fade[0] + 2, T.fade[1] + 6, 0, 1, easeOut)
  const rise = interp(f, T.fade[0] + 2, T.fade[1] + 6, 26, 0, easeBack)

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(BANK.x, BANK.y + rise)
  shadowEllipse(ctx, 0, 26, 190, 26, app, palette.rgb.brand)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Ступени: три плиты, каждая светлее нижней. Именно эта ступенчатость
  // светлот и требует производного ряда оттенков — одним токеном её не собрать.
  ctx.fillStyle = palette.tint.l3
  roundRectPath(ctx, -196, 4, 392, 20, 7)
  ctx.fill()
  ctx.fillStyle = palette.tint.step
  roundRectPath(ctx, -178, -14, 356, 20, 7)
  ctx.fill()
  ctx.fillStyle = palette.tint.l2
  roundRectPath(ctx, -160, -32, 320, 20, 7)
  ctx.fill()

  // Стилобат
  ctx.fillStyle = palette.brand
  roundRectPath(ctx, -152, -46, 304, 16, 5)
  ctx.fill()

  // Задняя стена
  ctx.fillStyle = palette.tint.wall
  roundRectPath(ctx, -136, -186, 272, 142, 6)
  ctx.fill()
  ctx.strokeStyle = palette.tint.outline
  ctx.lineWidth = 2
  roundRectPath(ctx, -136, -186, 272, 142, 6)
  ctx.stroke()

  // Дверь: прямоугольник с полукруглым верхом и блик на левой створке
  ctx.fillStyle = palette.deep
  ctx.beginPath()
  ctx.moveTo(-26, -46)
  ctx.lineTo(-26, -118)
  ctx.arc(0, -118, 26, Math.PI, 0)
  ctx.lineTo(26, -46)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(palette.rgb.brandInk, 0.22)
  roundRectPath(ctx, -18, -112, 14, 60, 5)
  ctx.fill()

  // Окна с крестовиной
  ctx.fillStyle = palette.tint.window
  ctx.strokeStyle = palette.deep
  ctx.lineWidth = 2.4
  const windows: readonly [number, number][] = [
    [-104, -150],
    [76, -150],
  ]
  for (const [x, y] of windows) {
    roundRectPath(ctx, x, y, 28, 44, 5)
    ctx.fill()
    roundRectPath(ctx, x, y, 28, 44, 5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 14, y)
    ctx.lineTo(x + 14, y + 44)
    ctx.moveTo(x, y + 22)
    ctx.lineTo(x + 28, y + 22)
    ctx.stroke()
  }

  // Шесть колонн: тело, две каннелюры, капитель и база
  for (let i = 0; i < 6; i += 1) {
    const x = -128 + i * 51.2
    ctx.fillStyle = palette.tint.l2
    ctx.strokeStyle = palette.brand
    ctx.lineWidth = 2.2
    roundRectPath(ctx, x - 11, -176, 22, 130, 4)
    ctx.fill()
    roundRectPath(ctx, x - 11, -176, 22, 130, 4)
    ctx.stroke()
    ctx.strokeStyle = rgba(palette.rgb.brandFlute, 0.35)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x - 4, -168)
    ctx.lineTo(x - 4, -56)
    ctx.moveTo(x + 4, -168)
    ctx.lineTo(x + 4, -56)
    ctx.stroke()
    ctx.fillStyle = palette.brand
    roundRectPath(ctx, x - 16, -186, 32, 12, 3)
    ctx.fill()
    roundRectPath(ctx, x - 15, -58, 30, 12, 3)
    ctx.fill()
  }

  // Антаблемент с надписью
  ctx.fillStyle = palette.brand
  roundRectPath(ctx, -172, -212, 344, 28, 6)
  ctx.fill()
  trackedText(
    ctx,
    sign,
    0,
    -192,
    17,
    WEIGHT_BOLD,
    rgba(palette.rgb.brandInk, 0.85),
    palette.font,
    0.32,
    'center',
  )

  // Фронтон с розеткой: круг и восемь лучей
  ctx.beginPath()
  ctx.moveTo(-182, -212)
  ctx.lineTo(0, -300)
  ctx.lineTo(182, -212)
  ctx.closePath()
  ctx.fillStyle = palette.tint.l1
  ctx.fill()
  ctx.strokeStyle = palette.brand
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.strokeStyle = palette.brand
  ctx.lineWidth = 2.6
  circlePath(ctx, 0, -244, 17)
  ctx.stroke()
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 21, -244 + Math.sin(a) * 21)
    ctx.lineTo(Math.cos(a) * 27, -244 + Math.sin(a) * 27)
    ctx.stroke()
  }

  // Флаг. Колышется от sin(f/9) — фаза считается от НОМЕРА КАДРА, поэтому
  // время сцены обязано накапливаться только из delta: скачок фазы после
  // паузы был бы виден как рывок полотна.
  ctx.strokeStyle = palette.brand
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(0, -300)
  ctx.lineTo(0, -352)
  ctx.stroke()
  const wave = Math.sin(f / 9) * 4
  // Полотно светлее мачты — здесь нужна именно СВЕТЛОТА, поэтому осветлённый
  // accent, а не accent-dim: тот темнее accent, и флаг стал бы темнее здания.
  ctx.fillStyle = palette.brandLift
  ctx.beginPath()
  ctx.moveTo(0, -350)
  ctx.quadraticCurveTo(24, -344 + wave, 46, -338)
  ctx.quadraticCurveTo(24, -330 + wave, 0, -326)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/**
 * Карта, вылетающая из банка: всплывает, поднимается на 44 и уходит,
 * уменьшаясь. Живёт только в окне T.card, за его пределами не рисуется вовсе.
 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  shades: SceneBrandShades,
): void {
  if (f < T.card[0] || f > T.card[1] + 4) return

  // Уход: последние 8 кадров окна плюс 12 после него — карта гаснет и жмётся.
  const out = clamp((f - (T.card[1] - 8)) / 12, 0, 1)
  const pop = interp(f, T.card[0], T.card[0] + 10, 0, 1, easeBack)
  const y = CARD.y - interp(f, T.card[0], T.card[1], 0, 44, easeIO)
  const scale = pop * (1 - out * 0.55)

  ctx.save()
  ctx.globalAlpha = clamp(pop - out, 0, 1)
  ctx.translate(CARD.x, y)
  ctx.rotate(-0.12 + Math.sin(f / 12) * 0.03)
  ctx.scale(scale, scale)

  ctx.shadowColor = rgba(palette.rgb.brand, 0.4)
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 12
  const g = ctx.createLinearGradient(-78, -50, 78, 50)
  g.addColorStop(0, shades.cardFrom)
  g.addColorStop(1, shades.cardTo)
  ctx.fillStyle = g
  roundRectPath(ctx, -78, -50, 156, 100, 14)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // Светлая полоса сверху
  ctx.fillStyle = rgba(palette.rgb.brandInk, 0.14)
  roundRectPath(ctx, -78, -50, 156, 34, 14)
  ctx.fill()

  // Чип
  const chip = ctx.createLinearGradient(-56, -14, -24, 10)
  chip.addColorStop(0, ILLUSTRATION.gold2)
  chip.addColorStop(1, ILLUSTRATION.gold4)
  ctx.fillStyle = chip
  roundRectPath(ctx, -56, -14, 32, 24, 5)
  ctx.fill()
  ctx.strokeStyle = ILLUSTRATION.chipLine
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-48, -14)
  ctx.lineTo(-48, 10)
  ctx.moveTo(-38, -14)
  ctx.lineTo(-38, 10)
  ctx.stroke()

  // Дуги бесконтактной оплаты
  ctx.strokeStyle = rgba(palette.rgb.brandInk, 0.9)
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 1; i <= 3; i += 1) {
    ctx.beginPath()
    ctx.arc(-4, -2, 4 + i * 7, -0.85, 0.85)
    ctx.stroke()
  }

  // Номер: три группы по четыре точки
  ctx.fillStyle = rgba(palette.rgb.brandInk, 0.75)
  for (let group = 0; group < 3; group += 1) {
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath()
      ctx.arc(-56 + group * 34 + i * 7, 30, 2.4, 0, FULL)
      ctx.fill()
    }
  }

  ctx.restore()
}
