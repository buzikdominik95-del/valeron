/**
 * Монеты: сама монета с вращением, полёт по дугам Безье со шлейфом,
 * кольца-импульсы с искрами при попадании и плашка «+сумма».
 */

import { CARD, COINS, HUB, PER, T, WAL } from '@/features/account/scene/transfer-timeline'
import {
  FULL,
  circlePath,
  clamp,
  easeIO,
  easeOut,
  rgba,
  rnd,
  roundRectPath,
  text,
  textWidth,
  WEIGHT_BOLD,
} from '@/features/account/scene/draw-utils'
import { ILLUSTRATION } from '@/features/account/scene/transfer-palette'
import type { ScenePalette, StateColors } from '@/features/account/scene/transfer-palette'

/**
 * Монета. phase — угол вращения: от него зависит видимая ширина, и на ребре
 * (|cos| < 0.20) вместо диска рисуется узкая полоска с градиентом торца.
 * Знак валюты появляется только когда монета раскрыта больше чем на 42%,
 * иначе он сминается в чёрточку.
 */
export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phase: number,
  alpha: number,
  font: string,
): void {
  const sx = Math.cos(phase)
  const w = Math.abs(sx) * r

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = ILLUSTRATION.goldShadow
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 7

  if (w < r * 0.2) {
    const edge = ctx.createLinearGradient(x, y - r, x, y + r)
    edge.addColorStop(0, ILLUSTRATION.goldEdgeLit)
    edge.addColorStop(1, ILLUSTRATION.goldEdgeDark)
    ctx.fillStyle = edge
    roundRectPath(ctx, x - r * 0.13, y - r, r * 0.26, r * 2, r * 0.13)
    ctx.fill()
  } else {
    const body = ctx.createRadialGradient(x - w * 0.35, y - r * 0.35, 2, x, y, r)
    body.addColorStop(0, ILLUSTRATION.gold1)
    body.addColorStop(0.34, ILLUSTRATION.gold2)
    body.addColorStop(0.66, ILLUSTRATION.gold3)
    body.addColorStop(1, ILLUSTRATION.gold4)
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.ellipse(x, y, w, r, 0, 0, FULL)
    ctx.fill()

    // Тень тела уже положена — дальше она мешала бы обводкам
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.strokeStyle = ILLUSTRATION.gold1
    ctx.lineWidth = r * 0.11
    ctx.beginPath()
    ctx.ellipse(x, y, w * 0.82, r * 0.82, 0, 0, FULL)
    ctx.stroke()
    ctx.strokeStyle = ILLUSTRATION.goldRim
    ctx.lineWidth = r * 0.07
    ctx.beginPath()
    ctx.ellipse(x, y, w * 0.68, r * 0.68, 0, 0, FULL)
    ctx.stroke()

    if (w > r * 0.42) {
      // Знак сжимается вместе с монетой: scale(|cos|, 1) вокруг её центра.
      // Кегль привязан к радиусу, поэтому «€» садится на монету любого размера.
      ctx.save()
      ctx.font = `${WEIGHT_BOLD} ${r * 1.1}px ${font}`
      ctx.fillStyle = ILLUSTRATION.goldSign
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.translate(x, y)
      ctx.scale(Math.abs(sx), 1)
      ctx.fillText('€', 0, 1)
      ctx.restore()
    }
  }

  ctx.restore()
}

interface Point {
  x: number
  y: number
}

/** Точка на квадратичной кривой Безье (эталонная qb). */
function quadPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

/**
 * Летящие монеты. Каждая проходит две дуги: карта → хаб и хаб → кошелёк.
 * Между ними пауза T.gap, когда монета не рисуется вовсе — она «внутри» хаба.
 *
 * Подъём дуги растёт с номером монеты (170 + i·34), поэтому три траектории
 * не сливаются в одну линию.
 */
export function drawFlying(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
): void {
  COINS.forEach((coin, i) => {
    const from1: Point = { x: CARD.x - 6, y: CARD.y - 30 }
    const to1: Point = { x: HUB.x, y: HUB.y }
    const from2: Point = { x: HUB.x, y: HUB.y }
    const to2: Point = { x: WAL.x - 44 + i * 44, y: WAL.y - 58 }

    let a: Point | null = null
    let b: Point | null = null
    let t = 0
    if (f >= coin.a && f <= coin.b) {
      a = from1
      b = to1
      t = (f - coin.a) / (coin.b - coin.a)
    } else if (f >= coin.c && f <= coin.d) {
      a = from2
      b = to2
      t = (f - coin.c) / (coin.d - coin.c)
    }
    if (!a || !b) return

    const lift = 170 + i * 34
    const ctrl: Point = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift }
    const head = quadPoint(a, ctrl, b, easeIO(t))

    // Шлейф: двенадцать кружков позади монеты по той же кривой. Шаг 0.016
    // в параметре, а не в пикселях, поэтому на длинной дуге след растянут,
    // а на короткой собран — именно так, как в эталоне.
    for (let k = 1; k <= 12; k += 1) {
      const tt = clamp(easeIO(t) - k * 0.016, 0, 1)
      const point = quadPoint(a, ctrl, b, tt)
      ctx.save()
      ctx.globalAlpha = (1 - k / 12) * 0.34
      ctx.fillStyle = ILLUSTRATION.goldTrail
      ctx.beginPath()
      ctx.arc(point.x, point.y, 15 * (1 - k / 13), 0, FULL)
      ctx.fill()
      ctx.restore()
    }

    // Гашение на концах отрезка: монета не появляется и не исчезает щелчком
    const fade = t < 0.06 ? t / 0.06 : t > 0.95 ? (1 - t) / 0.05 : 1
    drawCoin(ctx, head.x, head.y, 27, (f - coin.a) * 0.3 + i, clamp(fade, 0, 1), palette.font)
  })
}

/**
 * Кольца и искры при попадании монеты в кошелёк плюс большой финальный
 * импульс от третьей монеты.
 *
 * При отказе кольца становятся ШТРИХОВЫМИ: смена цвета на красный сама по себе
 * состояние не передаёт (контраст к зелёному около 1.5), а рваная дуга видна
 * и на ч/б.
 */
export function drawImpulse(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  state: StateColors,
  failed: boolean,
): void {
  for (const coin of COINS) {
    const t = (f - coin.d) / 28
    if (t >= 0 && t < 1) {
      ctx.save()
      ctx.globalAlpha = (1 - t) * 0.75
      ctx.strokeStyle = state.main
      ctx.lineWidth = 5
      if (failed) ctx.setLineDash([14, 12])
      circlePath(ctx, WAL.x, WAL.y - 52, 52 + easeOut(t) * 84)
      ctx.stroke()
      ctx.restore()
    }

    // Искры: девять штук, направление и скорость из детерминированного шума,
    // плюс 0.075·t² — падение под собственным весом.
    for (let i = 0; i < 9; i += 1) {
      const tt = f - coin.d
      if (tt >= 0 && tt < 34) {
        const angle = rnd(i + coin.d) * FULL
        const speed = 2.2 + rnd(i + coin.d + 9) * 3.4
        const x = WAL.x + Math.cos(angle) * speed * tt
        const y = WAL.y - 56 + Math.sin(angle) * speed * tt + 0.075 * tt * tt
        ctx.save()
        ctx.globalAlpha = clamp(1 - tt / 34, 0, 1)
        ctx.fillStyle = ILLUSTRATION.gold3
        ctx.shadowColor = ILLUSTRATION.goldSpark
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(x, y, 3.4, 0, FULL)
        ctx.fill()
        ctx.restore()
      }
    }
  }

  // Большой финальный импульс — от третьей монеты, шире и медленнее прочих
  const last = COINS[2]
  const t2 = (f - last.d) / 40
  if (t2 >= 0 && t2 < 1) {
    ctx.save()
    ctx.globalAlpha = (1 - t2) * 0.3
    ctx.strokeStyle = palette.brandLift
    ctx.lineWidth = 3.4
    circlePath(ctx, PER.x, PER.y - 150, 130 + easeOut(t2) * 130)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * Плашка «+сумма», уплывающая вверх над человеком.
 *
 * ПОВТОРЯЕТСЯ КАЖДЫЙ ОБОРОТ ЦИКЛА — как в эталоне. Решение осознанное:
 * плашка подписывает монету ВНУТРИ иллюстрации («вот столько прилетело»),
 * а правду о состоянии перевода несут полоса прогресса, шаги, часы и
 * sr-only-строка снаружи канваса — они идут из пропов и не врут.
 * При отказе плашки нет вовсе.
 */
export function drawCreditBadge(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  state: StateColors,
  /** Готовая строка «+10 000 €» из локали. */
  label: string,
): void {
  if (f < T.credit[0] || f > T.credit[1]) return

  const t = (f - T.credit[0]) / (T.credit[1] - T.credit[0])
  // Подъём кончается на 45% окна (t*2.2), дальше плашка стоит и гаснет
  const y = PER.y - 410 - easeOut(clamp(t * 2.2, 0, 1)) * 84
  const alpha = t < 0.12 ? t / 0.12 : t > 0.72 ? clamp((1 - t) / 0.28, 0, 1) : 1

  ctx.save()
  ctx.globalAlpha = alpha
  const width = textWidth(ctx, label, 38, WEIGHT_BOLD, palette.font) + 56
  ctx.shadowColor = rgba(state.rgb, 0.35)
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = state.soft
  roundRectPath(ctx, PER.x - width / 2, y - 38, width, 62, 31)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = state.line
  ctx.lineWidth = 2.4
  roundRectPath(ctx, PER.x - width / 2, y - 38, width, 62, 31)
  ctx.stroke()
  // Текст на плашке — тем же цветом состояния. В эталоне здесь отдельный
  // тёмно-зелёный #0b7d4e; наш --color-success темнее эталонного ok, и
  // отдельная ступень уже не нужна: контраст к мягкой заливке проходит.
  text(ctx, label, PER.x, y + 4, 38, WEIGHT_BOLD, state.main, palette.font, 'center')
  ctx.restore()
}
