/**
 * Кошелёк, висящий перед грудью: задняя стенка, торчащая карта, осевшие
 * монеты, передняя стенка, пунктирная строчка, планка и золотая застёжка.
 *
 * Монеты рисуются МЕЖДУ стенками — передняя перекрывает их, и они читаются
 * убранными внутрь. Это единственная причина, по которой кошелёк не разложен
 * на два вызова: порядок внутри него несёт смысл и переставлять его нельзя.
 */

import { COINS, T, WAL } from '@/features/account/scene/transfer-timeline'
import {
  clamp,
  easeBack,
  easeOut,
  interp,
  rgba,
  roundRectPath,
} from '@/features/account/scene/draw-utils'
import { drawCoin } from '@/features/account/scene/draw-coins'
import { ILLUSTRATION } from '@/features/account/scene/transfer-palette'
import type { ScenePalette, SceneBrandShades } from '@/features/account/scene/transfer-palette'

/** Сколько монет уже село. Читается и кошельком, и подписью состояния. */
export function landedCount(f: number): number {
  return COINS.filter((coin) => f >= coin.d).length
}

export function drawWallet(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  shades: SceneBrandShades,
): void {
  const app = interp(f, T.fade[0] + 14, T.fade[1] + 18, 0, 1, easeOut)
  if (app <= 0.001) return

  const open = interp(f, T.wallet[0], T.wallet[1], 0, 1, easeOut)
  const breath = Math.sin(f / 26) * 2.4

  // Отскок при каждой посадке монеты: полусинусоида на 16 кадров, затухающая
  // множителем (1 - t/26). Именно он делает попадание ощутимым.
  let bump = 0
  for (const coin of COINS) {
    const t = f - coin.d
    if (t >= 0 && t < 16) bump += Math.sin((t / 16) * Math.PI) * 7 * (1 - t / 26)
  }

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(WAL.x, WAL.y + breath - bump)
  const scale = interp(f, T.fade[0] + 14, T.fade[1] + 18, 0.62, 0.78, easeBack)
  ctx.scale(scale, scale)

  /* задняя стенка */
  ctx.save()
  ctx.shadowColor = rgba(palette.rgb.deep, 0.34)
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 16
  const back = ctx.createLinearGradient(-118, -96, 118, 70)
  back.addColorStop(0, shades.walletBackFrom)
  back.addColorStop(1, shades.walletBackTo)
  ctx.fillStyle = back
  roundRectPath(ctx, -118, -96, 236, 166, 22)
  ctx.fill()
  ctx.restore()

  /* карта, торчащая сверху: выезжает вместе с раскрытием */
  ctx.save()
  ctx.translate(16, -98 - open * 20)
  ctx.rotate(-0.07)
  ctx.fillStyle = palette.tint.cardFace
  ctx.strokeStyle = palette.tint.outline
  ctx.lineWidth = 2.4
  roundRectPath(ctx, -82, -32, 164, 64, 10)
  ctx.fill()
  roundRectPath(ctx, -82, -32, 164, 64, 10)
  ctx.stroke()
  ctx.fillStyle = ILLUSTRATION.gold3
  roundRectPath(ctx, -68, -18, 26, 20, 4)
  ctx.fill()
  // Дуги бесконтактной оплаты обязаны читаться как БРЕНД — берём сам accent,
  // а не осветлённый: это знак платёжной системы, а не светлая линия.
  ctx.strokeStyle = palette.brand
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  for (let i = 1; i <= 3; i += 1) {
    ctx.beginPath()
    ctx.arc(-22, -6, 3 + i * 6, -0.8, 0.8)
    ctx.stroke()
  }
  ctx.fillStyle = palette.tint.dots
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.arc(-62 + i * 9, 18, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  /* осевшие монеты — за передней стенкой */
  const landed = landedCount(f)
  for (let i = 0; i < landed; i += 1) {
    const coin = COINS[i]
    if (!coin) continue
    const t = clamp((f - coin.d) / 14, 0, 1)
    const x = -56 + i * 56
    const y = -72 - easeBack(t) * 10
    // Фаза 0.5 + i·0.9 — монеты стоят под разными углами, иначе три
    // одинаковых диска читались бы как один нарисованный трижды.
    drawCoin(ctx, x, y, 28, 0.5 + i * 0.9, 1, palette.font)
  }

  /* передняя стенка */
  const front = ctx.createLinearGradient(-118, -40, 118, 74)
  front.addColorStop(0, shades.walletFrontFrom)
  front.addColorStop(1, shades.walletFrontTo)
  ctx.fillStyle = front
  roundRectPath(ctx, -118, -44, 236, 116, 20)
  ctx.fill()
  ctx.fillStyle = rgba(palette.rgb.brandInk, 0.1)
  roundRectPath(ctx, -118, -44, 236, 30, 18)
  ctx.fill()

  // Пунктирная строчка по канту
  ctx.strokeStyle = rgba(palette.rgb.brandInk, 0.26)
  ctx.lineWidth = 2
  ctx.setLineDash([7, 7])
  roundRectPath(ctx, -104, -30, 208, 88, 14)
  ctx.stroke()
  ctx.setLineDash([])

  // Планка поперёк и золотая застёжка справа
  const band = ctx.createLinearGradient(-118, 10, 118, 40)
  band.addColorStop(0, rgba(palette.rgb.brandInk, 0.06))
  band.addColorStop(1, rgba(palette.rgb.brandInk, 0.02))
  ctx.fillStyle = band
  roundRectPath(ctx, -118, 6, 236, 26, 4)
  ctx.fill()

  const clasp = ctx.createLinearGradient(84, 4, 118, 36)
  clasp.addColorStop(0, ILLUSTRATION.gold2)
  clasp.addColorStop(1, ILLUSTRATION.gold4)
  ctx.fillStyle = clasp
  roundRectPath(ctx, 86, 2, 32, 34, 9)
  ctx.fill()

  ctx.restore()
}
