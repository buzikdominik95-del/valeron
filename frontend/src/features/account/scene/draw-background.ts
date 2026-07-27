/**
 * Фон сцены: вертикальный градиент, свечение сверху и точечная сетка.
 *
 * Градиент эталона (#ffffff → #f4f7fd → #e9eefa) почти совпал с нашими ролями
 * surface / ground / raised — так что здесь перенос обошёлся без потерь вовсе.
 */

import { DESIGN_H, DESIGN_W } from '@/features/account/scene/transfer-timeline'
import { FULL, rgba } from '@/features/account/scene/draw-utils'
import type { ScenePalette } from '@/features/account/scene/transfer-palette'

/** Значения ground и raised нужны только фону, поэтому читаются не в палитру,
    а сюда — как отдельная пара, которую собирает transfer-scene. */
export interface BackgroundColors {
  /** Верх градиента. */
  top: string
  /** Середина. */
  middle: string
  /** Низ. */
  bottom: string
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  colors: BackgroundColors,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, DESIGN_H)
  g.addColorStop(0, colors.top)
  g.addColorStop(0.55, colors.middle)
  g.addColorStop(1, colors.bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H)

  // Свечение из точки над кадром: центр вынесен на -140, поэтому в кадр
  // попадает только нижняя часть купола, и верх сцены светлеет к середине.
  const r = ctx.createRadialGradient(DESIGN_W * 0.5, -140, 60, DESIGN_W * 0.5, -140, 900)
  r.addColorStop(0, rgba(palette.rgb.brandLift, 0.13))
  r.addColorStop(1, rgba(palette.rgb.brandLift, 0))
  ctx.fillStyle = r
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H)

  // Точечная сетка. Стоит только в полосе 300…780 по вертикали — там, где
  // живут узлы: под интерфейсным слоем она мешала бы читать текст.
  ctx.save()
  ctx.fillStyle = rgba(palette.rgb.brand, 0.045)
  for (let x = 120; x < DESIGN_W - 80; x += 44) {
    for (let y = 300; y < 780; y += 44) {
      ctx.beginPath()
      ctx.arc(x, y, 1.4, 0, FULL)
      ctx.fill()
    }
  }
  ctx.restore()
}
