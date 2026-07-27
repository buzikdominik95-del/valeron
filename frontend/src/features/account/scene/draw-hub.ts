/**
 * Хаб Velora: свечение, пунктирная орбита, кольцо, поглощающие кольца,
 * шар с градиентом и знаком V, три орбитальных чипа со значками.
 */

import { COINS, HUB, T } from '@/features/account/scene/transfer-timeline'
import {
  FULL,
  circlePath,
  easeBack,
  easeOut,
  interp,
  rgba,
} from '@/features/account/scene/draw-utils'
import { gBolt, gGlobe, gShield } from '@/features/account/scene/draw-glyphs'
import type { Glyph } from '@/features/account/scene/draw-glyphs'
import type { ScenePalette, SceneBrandShades } from '@/features/account/scene/transfer-palette'

/** Значки орбитальных чипов: защита, скорость, международность. */
const CHIP_GLYPHS: readonly [Glyph, Glyph, Glyph] = [gShield, gBolt, gGlobe]

export function drawHub(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  shades: SceneBrandShades,
): void {
  const app = interp(f, T.fade[0] + 6, T.fade[1] + 10, 0, 1, easeOut)
  const scale = interp(f, T.fade[0] + 6, T.fade[1] + 10, 0.7, 1, easeBack)

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(HUB.x, HUB.y)
  ctx.scale(scale, scale)

  // Свечение вокруг шара
  const glow = ctx.createRadialGradient(0, 0, 40, 0, 0, 210)
  glow.addColorStop(0, rgba(palette.rgb.brandLift, 0.16))
  glow.addColorStop(1, rgba(palette.rgb.brandLift, 0))
  ctx.fillStyle = glow
  circlePath(ctx, 0, 0, 210)
  ctx.fill()

  // Пунктирная орбита. Точки, а не штрихи: [2, 12] при lineCap 'butt' даёт
  // именно точечный след, по которому едут чипы.
  ctx.strokeStyle = rgba(palette.rgb.brandLift, 0.28)
  ctx.lineWidth = 2
  ctx.setLineDash([2, 12])
  circlePath(ctx, 0, 0, 152)
  ctx.stroke()
  ctx.setLineDash([])

  // Сплошное внутреннее кольцо
  ctx.strokeStyle = rgba(palette.rgb.brandHalo, 0.7)
  ctx.lineWidth = 2
  circlePath(ctx, 0, 0, 112)
  ctx.stroke()

  // Поглощающие кольца: расходятся от шара в момент, когда в него попала
  // монета. Кадр отсчитывается от c.b — конца первого отрезка дуги.
  for (const coin of COINS) {
    const t = (f - coin.b) / 24
    if (t >= 0 && t < 1) {
      ctx.save()
      ctx.globalAlpha = (1 - t) * 0.65
      ctx.strokeStyle = palette.brandLift
      ctx.lineWidth = 4
      circlePath(ctx, 0, 0, 96 + easeOut(t) * 66)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Шар: радиальный градиент со смещённым центром — свет падает слева сверху
  ctx.save()
  ctx.shadowColor = rgba(palette.rgb.deep, 0.45)
  ctx.shadowBlur = 44
  ctx.shadowOffsetY = 18
  const orb = ctx.createRadialGradient(-26, -34, 10, 0, 0, 104)
  orb.addColorStop(0, shades.orbFrom)
  orb.addColorStop(0.5, shades.orbMid)
  orb.addColorStop(1, shades.orbTo)
  ctx.fillStyle = orb
  circlePath(ctx, 0, 0, 96)
  ctx.fill()
  ctx.restore()

  // Блик — наклонённый эллипс на левом верхнем краю
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = palette.brandInk
  ctx.beginPath()
  ctx.ellipse(-28, -40, 42, 26, -0.5, 0, FULL)
  ctx.fill()
  ctx.restore()

  // Знак V
  ctx.strokeStyle = palette.brandInk
  ctx.lineWidth = 15
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-40, -44)
  ctx.lineTo(0, 46)
  ctx.lineTo(40, -44)
  ctx.stroke()

  // Три орбитальных чипа. Угол идёт от номера кадра: 0.42° за кадр — полный
  // оборот примерно за 28 секунд, то есть медленнее цикла сцены.
  for (let i = 0; i < 3; i += 1) {
    const a = ((f * 0.42 + i * 120) * Math.PI) / 180
    const radius = 152
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius

    ctx.save()
    ctx.shadowColor = rgba(palette.rgb.brand, 0.18)
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 5
    ctx.fillStyle = palette.surface
    circlePath(ctx, x, y, 27)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = palette.tint.ring
    ctx.lineWidth = 1.8
    circlePath(ctx, x, y, 27)
    ctx.stroke()

    // Значок обязан читаться как БРЕНД, а не как светлая линия: здесь берём
    // сам accent, а не осветлённый — это тот случай, где важна насыщенность.
    ctx.strokeStyle = palette.brand
    ctx.fillStyle = palette.brand
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const glyph = CHIP_GLYPHS[i]
    if (glyph) glyph(ctx, x, y, 26)
  }

  ctx.restore()
}
