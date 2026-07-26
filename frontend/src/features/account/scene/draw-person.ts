/**
 * Человек-получатель: торс, руки, голова, лицо, волосы, значок «проверено».
 *
 * ДВА ОФОРМЛЕНИЯ. В эталоне их переключали кнопками — это была отладка автора,
 * и кнопок здесь нет. Оба варианта рисования сохранены, выбор идёт пропом look.
 * Это выбор ОФОРМЛЕНИЯ, а не вывод из имени: по имени пол не определяют, и
 * связывать причёску с props.name было бы и неверно, и оскорбительно.
 *
 * Геометрия оформления (ширина челюсти, высота подбородка, полуразмах плеч,
 * толщина брови, ресницы, щетина, галстук) разнесена в LOOK_SHAPE — те же
 * числа, что в объекте PEOPLE эталона. Поле neck оттуда НЕ перенесено:
 * в эталоне оно объявлено, но не читается нигде.
 */

import { PER, T } from '@/features/account/scene/transfer-timeline'
import {
  FULL,
  circlePath,
  easeBack,
  easeOut,
  interp,
  rgba,
  roundRectPath,
  shadowEllipse,
} from '@/features/account/scene/draw-utils'
import { gBang, gCheck, warningTrianglePath } from '@/features/account/scene/draw-glyphs'
import {
  ILLUSTRATION,
  LOOK_COLORS,
  SHADE,
} from '@/features/account/scene/transfer-palette'
import type {
  SceneBrandShades,
  SceneLook,
  ScenePalette,
  StateColors,
} from '@/features/account/scene/transfer-palette'

/** Геометрия и признаки оформления. */
interface LookShape {
  /** Множитель ширины лица. */
  jaw: number
  /** Высота подбородка от центра лица. */
  chin: number
  /** Полуразмах плеч. */
  sh: number
  /** Толщина брови. */
  brow: number
  /** Длина брови. */
  browW: number
  /** Ресница у внешнего угла глаза. */
  lash: boolean
  /** Прозрачность щетины; 0 — нет. */
  stub: number
  /** Галстук вместо цепочки. */
  tie: boolean
}

const LOOK_SHAPE: Record<SceneLook, LookShape> = {
  bob: { jaw: 0.95, chin: 60, sh: 78, brow: 4.2, browW: 11, lash: true, stub: 0, tie: false },
  crop: { jaw: 1.07, chin: 63, sh: 91, brow: 6.0, browW: 13, lash: false, stub: 0.15, tie: true },
}

/** Контур лица: лоб дугой, скулы, сходящийся подбородок. */
function facePath(ctx: CanvasRenderingContext2D, fw: number, chin: number): void {
  ctx.beginPath()
  ctx.moveTo(-fw, -16)
  ctx.bezierCurveTo(-fw, -54, -36, -69, 0, -69)
  ctx.bezierCurveTo(36, -69, fw, -54, fw, -16)
  ctx.bezierCurveTo(fw, 20, fw * 0.56, chin, 0, chin)
  ctx.bezierCurveTo(-fw * 0.56, chin, -fw, 20, -fw, -16)
  ctx.closePath()
}

/** Ладонь: тень под ней и сама кисть с градиентом. Пока руки внизу (open→0),
    кисть развёрнута наружу — отсюда поворот на (1 - open). */
function drawHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: number,
  open: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(side * (1 - open) * 0.45)

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = ILLUSTRATION.palmShade
  ctx.beginPath()
  ctx.ellipse(0, 4, 16, 17, 0, 0, FULL)
  ctx.fill()
  ctx.restore()

  const palm = ctx.createRadialGradient(-5, -7, 2, 0, 0, 21)
  palm.addColorStop(0, ILLUSTRATION.palmLit)
  palm.addColorStop(1, ILLUSTRATION.skin)
  ctx.fillStyle = palm
  ctx.beginPath()
  ctx.ellipse(0, 0, 17, 19, 0, 0, FULL)
  ctx.fill()
  ctx.restore()
}

/** Каре: шапка волос, две боковые пряди, светлая прядь набок. */
function drawHairBob(ctx: CanvasRenderingContext2D, look: SceneLook): void {
  const colors = LOOK_COLORS[look]
  ctx.fillStyle = colors.hair
  ctx.beginPath()
  ctx.moveTo(-59, 8)
  ctx.bezierCurveTo(-74, -32, -58, -76, 0, -76)
  ctx.bezierCurveTo(58, -76, 74, -32, 59, 8)
  ctx.lineTo(48, 8)
  ctx.bezierCurveTo(53, -24, 37, -44, 20, -42)
  ctx.bezierCurveTo(-7, -37, -35, -46, -47, -17)
  ctx.bezierCurveTo(-51, -6, -49, 3, -48, 8)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(-59, 5)
  ctx.quadraticCurveTo(-72, 32, -59, 54)
  ctx.quadraticCurveTo(-48, 34, -48, 5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(59, 5)
  ctx.quadraticCurveTo(72, 32, 59, 54)
  ctx.quadraticCurveTo(48, 34, 48, 5)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = colors.hairHi
  ctx.beginPath()
  ctx.moveTo(-42, -30)
  ctx.quadraticCurveTo(-16, -62, 26, -52)
  ctx.quadraticCurveTo(-4, -50, -34, -22)
  ctx.closePath()
  ctx.fill()
}

/** Короткая стрижка: шапка ниже, светлая прядь пробора. */
function drawHairCrop(ctx: CanvasRenderingContext2D, look: SceneLook): void {
  const colors = LOOK_COLORS[look]
  ctx.fillStyle = colors.hair
  ctx.beginPath()
  ctx.moveTo(-60, -4)
  ctx.bezierCurveTo(-66, -48, -42, -78, 0, -78)
  ctx.bezierCurveTo(42, -78, 66, -48, 60, -4)
  ctx.lineTo(51, -4)
  ctx.bezierCurveTo(54, -32, 42, -50, 14, -48)
  ctx.bezierCurveTo(-14, -46, -42, -52, -49, -22)
  ctx.lineTo(-51, -4)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = colors.hairHi
  ctx.beginPath()
  ctx.moveTo(-30, -62)
  ctx.quadraticCurveTo(6, -74, 40, -56)
  ctx.quadraticCurveTo(4, -62, -24, -52)
  ctx.closePath()
  ctx.fill()
}

export interface PersonFrame {
  look: SceneLook
  /** Состояние перевода: значок «проверено» или предупреждение. */
  failed: boolean
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  f: number,
  palette: ScenePalette,
  shades: SceneBrandShades,
  state: StateColors,
  frame: PersonFrame,
): void {
  const look = frame.look
  const shape = LOOK_SHAPE[look]
  const colors = LOOK_COLORS[look]

  const app = interp(f, T.fade[0] + 10, T.fade[1] + 14, 0, 1, easeOut)
  const rise = interp(f, T.fade[0] + 10, T.fade[1] + 14, 30, 0, easeBack)
  /** Дыхание: медленная синусоида, из неё же берут сдвиг плечи и голова. */
  const breath = Math.sin(f / 26) * 3
  const arm = interp(f, T.arms[0], T.arms[1], 0, 1, easeBack)
  const smile = interp(f, T.smile[0], T.smile[1], 0, 1, easeOut)

  // Моргание: три коротких окна по 7 кадров, внутри — полусинусоида,
  // то есть веко успевает закрыться и открыться.
  let blink = 0
  for (const at of T.blinks) {
    const t = f - at
    if (t >= 0 && t < 7) blink = Math.max(blink, Math.sin((t / 7) * Math.PI))
  }

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(PER.x, PER.y + rise)
  shadowEllipse(ctx, 0, 26, 150, 24, app, palette.rgb.brand)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const s0 = shape.sh

  /* --- торс --- */
  ctx.save()
  ctx.translate(0, breath * 0.5)
  const torso = ctx.createLinearGradient(-s0, -180, s0, -10)
  torso.addColorStop(0, shades.torsoTop)
  torso.addColorStop(0.45, shades.shirt[look])
  torso.addColorStop(1, shades.shirtDark[look])
  ctx.fillStyle = torso
  ctx.beginPath()
  ctx.moveTo(-s0, -166)
  ctx.bezierCurveTo(-s0 - 16, -152, -s0 - 24, -90, -s0 - 26, -20)
  ctx.quadraticCurveTo(0, -4, s0 + 26, -20)
  ctx.bezierCurveTo(s0 + 24, -90, s0 + 16, -152, s0, -166)
  ctx.bezierCurveTo(s0 * 0.6, -186, -s0 * 0.6, -186, -s0, -166)
  ctx.closePath()
  ctx.fill()

  // Складки ткани
  ctx.strokeStyle = SHADE.fold
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-s0 * 0.72, -140)
  ctx.quadraticCurveTo(-s0 * 0.5, -108, -s0 * 0.66, -70)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(s0 * 0.72, -140)
  ctx.quadraticCurveTo(s0 * 0.5, -108, s0 * 0.66, -70)
  ctx.stroke()

  // Шея и тень под подбородком
  ctx.fillStyle = ILLUSTRATION.skin
  roundRectPath(ctx, -21, -214, 42, 50, 15)
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = ILLUSTRATION.palmShade
  ctx.beginPath()
  ctx.ellipse(0, -206, 22, 12, 0, 0, FULL)
  ctx.fill()
  ctx.restore()

  // Кокетка плеча
  ctx.fillStyle = shades.shirt[look]
  ctx.beginPath()
  ctx.moveTo(-s0, -166)
  ctx.quadraticCurveTo(0, -188, s0, -166)
  ctx.quadraticCurveTo(0, -148, -s0, -166)
  ctx.closePath()
  ctx.fill()

  // Воротник: два белых треугольника с тенью по внутреннему краю
  ctx.fillStyle = palette.surface
  ctx.beginPath()
  ctx.moveTo(-34, -178)
  ctx.lineTo(-3, -122)
  ctx.lineTo(-13, -184)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(34, -178)
  ctx.lineTo(3, -122)
  ctx.lineTo(13, -184)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = SHADE.fold
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-34, -178)
  ctx.lineTo(-3, -122)
  ctx.moveTo(34, -178)
  ctx.lineTo(3, -122)
  ctx.stroke()

  if (shape.tie) {
    // Галстук: узел ромбом и полотнище с блеском по левому краю
    ctx.fillStyle = shades.tie
    ctx.beginPath()
    ctx.moveTo(0, -126)
    ctx.lineTo(-13, -112)
    ctx.lineTo(0, -96)
    ctx.lineTo(13, -112)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-11, -100)
    ctx.lineTo(11, -100)
    ctx.lineTo(7, -24)
    ctx.lineTo(0, -12)
    ctx.lineTo(-7, -24)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = rgba(palette.rgb.brandInk, 0.14)
    ctx.beginPath()
    ctx.moveTo(-11, -100)
    ctx.lineTo(-2, -100)
    ctx.lineTo(-2, -20)
    ctx.lineTo(-6, -24)
    ctx.closePath()
    ctx.fill()
  } else {
    // Цепочка с бусиной
    ctx.strokeStyle = ILLUSTRATION.chain
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(-26, -166)
    ctx.quadraticCurveTo(0, -134, 26, -166)
    ctx.stroke()
    ctx.fillStyle = ILLUSTRATION.chainBead
    circlePath(ctx, 0, -138, 5.4)
    ctx.fill()

    // Пуговицы планки — только когда галстука нет: под ним их не видно
    ctx.fillStyle = rgba(palette.rgb.brandInk, 0.42)
    for (const y of [-96, -66, -36]) {
      ctx.beginPath()
      ctx.arc(0, y, 3.6, 0, FULL)
      ctx.fill()
    }
  }
  ctx.restore()

  /* --- руки --- */
  // Симметрично: side = -1 левая, +1 правая. Внутри — плечо, локоть, кисть,
  // и все три точки едут по easeBack от «вниз» к «поднято».
  for (const side of [-1, 1]) {
    const shoulderX = side * s0 * 0.98
    const shoulderY = -160 + breath * 0.4
    const elbowX = side * interp(f, T.arms[0], T.arms[1], s0 + 26, s0 + 40, easeBack)
    const elbowY = interp(f, T.arms[0], T.arms[1], -78, -188, easeBack) + breath * 0.4
    const handX = side * interp(f, T.arms[0], T.arms[1], s0 + 34, s0 + 16, easeBack)
    const handY = interp(f, T.arms[0], T.arms[1], 12, -304, easeBack) + breath * 0.6

    // Рукав — толстая линия по дуге от плеча к локтю
    ctx.strokeStyle = shades.shirt[look]
    ctx.lineWidth = 38
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY)
    ctx.quadraticCurveTo(side * Math.abs(elbowX) * 1.03, (shoulderY + elbowY) / 2, elbowX, elbowY)
    ctx.stroke()

    // Изнанка рукава у локтя
    ctx.strokeStyle = SHADE.sleeve
    ctx.lineWidth = 38
    ctx.beginPath()
    ctx.moveTo(elbowX, elbowY)
    ctx.lineTo(elbowX + (handX - elbowX) * 0.15, elbowY + (handY - elbowY) * 0.15)
    ctx.stroke()

    // Манжета
    ctx.strokeStyle = palette.surface
    ctx.lineWidth = 30
    ctx.beginPath()
    ctx.moveTo(elbowX + (handX - elbowX) * 0.15, elbowY + (handY - elbowY) * 0.15)
    ctx.lineTo(elbowX + (handX - elbowX) * 0.26, elbowY + (handY - elbowY) * 0.26)
    ctx.stroke()

    // Предплечье
    ctx.strokeStyle = ILLUSTRATION.skin
    ctx.lineWidth = 28
    ctx.beginPath()
    ctx.moveTo(elbowX + (handX - elbowX) * 0.24, elbowY + (handY - elbowY) * 0.24)
    ctx.quadraticCurveTo((elbowX + handX) / 2, (elbowY + handY) / 2, handX, handY)
    ctx.stroke()

    drawHand(ctx, handX, handY, side, arm)
  }

  /* --- голова --- */
  ctx.save()
  ctx.translate(0, -268 + breath)
  // Едва заметный наклон: 0.010 рад — около полуградуса. Больше читалось бы
  // как качание головой, а нужно только «человек живой».
  ctx.rotate(Math.sin(f / 34) * 0.01)
  const fw = 56 * shape.jaw

  // Уши
  ctx.fillStyle = ILLUSTRATION.skin
  circlePath(ctx, -fw + 4, 6, 12)
  ctx.fill()
  circlePath(ctx, fw - 4, 6, 12)
  ctx.fill()
  ctx.strokeStyle = ILLUSTRATION.skinShade
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(-fw + 4, 6, 5.4, -1.1, 1.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(fw - 4, 6, 5.4, Math.PI - 1.6, Math.PI + 1.1)
  ctx.stroke()

  // Лицо
  const face = ctx.createLinearGradient(-fw, -60, fw * 0.6, shape.chin)
  face.addColorStop(0, ILLUSTRATION.palmLit)
  face.addColorStop(1, ILLUSTRATION.skin)
  facePath(ctx, fw, shape.chin)
  ctx.fillStyle = face
  ctx.fill()

  // Тени, обрезанные по контуру лица: полоса под волосами, тень у правой
  // скулы и щетина. Без clip они вылезали бы за силуэт.
  ctx.save()
  facePath(ctx, fw, shape.chin)
  ctx.clip()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = ILLUSTRATION.faceShade
  ctx.beginPath()
  ctx.ellipse(0, -46, fw * 0.9, 15, 0, 0, FULL)
  ctx.fill()
  ctx.globalAlpha = 0.12
  ctx.beginPath()
  ctx.ellipse(fw * 0.72, 4, 20, 42, 0, 0, FULL)
  ctx.fill()
  if (shape.stub > 0) {
    ctx.globalAlpha = shape.stub
    ctx.fillStyle = ILLUSTRATION.stubble
    ctx.beginPath()
    ctx.ellipse(0, shape.chin * 0.62, fw * 0.86, 26, 0, 0, FULL)
    ctx.fill()
  }
  ctx.restore()

  // Волосы поверх лица: они закрывают лоб, поэтому идут после теней
  if (look === 'bob') drawHairBob(ctx, look)
  else drawHairCrop(ctx, look)

  // Румяна приходят вместе с улыбкой
  if (smile > 0) {
    ctx.save()
    ctx.globalAlpha = smile * 0.48
    ctx.fillStyle = ILLUSTRATION.blush
    ctx.beginPath()
    ctx.ellipse(-fw * 0.6, 18, 13, 8, 0, 0, FULL)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(fw * 0.6, 18, 13, 8, 0, 0, FULL)
    ctx.fill()
    ctx.restore()
  }

  // Брови поднимаются с улыбкой
  const browLift = -smile * 5
  ctx.strokeStyle = colors.brow
  ctx.lineWidth = shape.brow
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-34, -19 + browLift)
  ctx.quadraticCurveTo(-22, -26 + browLift, -34 + shape.browW + 8, -20 + browLift)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(34, -19 + browLift)
  ctx.quadraticCurveTo(22, -26 + browLift, 34 - shape.browW - 8, -20 + browLift)
  ctx.stroke()

  // Глаза: белок, тень века, радужка с градиентом, блеск, линия века, ресница
  for (const ex of [-22, 22]) {
    const open = 1 - blink
    if (open > 0.06) {
      ctx.fillStyle = ILLUSTRATION.eyeWhite
      ctx.beginPath()
      ctx.ellipse(ex, -3, 11.4, 9.8 * open, 0, 0, FULL)
      ctx.fill()

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(ex, -3, 11.4, 9.8 * open, 0, 0, FULL)
      ctx.clip()
      ctx.globalAlpha = 0.16
      ctx.fillStyle = ILLUSTRATION.lidShade
      ctx.beginPath()
      ctx.ellipse(ex, -9 - 3 * open, 12, 5, 0, 0, FULL)
      ctx.fill()
      ctx.restore()

      const iris = ctx.createRadialGradient(ex, -4, 1, ex + 1, -3, 6)
      iris.addColorStop(0, ILLUSTRATION.irisLit)
      iris.addColorStop(1, ILLUSTRATION.irisDark)
      ctx.fillStyle = iris
      ctx.beginPath()
      ctx.ellipse(ex + 1, -3, 5.6, 5.6 * Math.min(open * 1.2, 1), 0, 0, FULL)
      ctx.fill()

      // Блеск — маленький кружок сверху справа от зрачка. Без него взгляд
      // становится стеклянным; из-за него сцена и читается живой.
      ctx.fillStyle = ILLUSTRATION.eyeGleam
      ctx.beginPath()
      ctx.arc(ex + 3.2, -5.6, 2, 0, FULL)
      ctx.fill()
    }

    // Линия века рисуется ВСЕГДА, в том числе на закрытом глазу: при open→0
    // она опускается на место разреза и читается как сомкнутое веко.
    ctx.strokeStyle = colors.eye
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(ex - 11.4, -3 - 9.8 * open)
    ctx.quadraticCurveTo(ex, -11.6 - 2 * open, ex + 11.4, -3 - 9.8 * open)
    ctx.stroke()

    if (shape.lash && open > 0.4) {
      ctx.lineWidth = 2.4
      const lx = ex + (ex < 0 ? -11 : 11)
      ctx.beginPath()
      ctx.moveTo(lx, -6 - 6 * open)
      ctx.lineTo(lx + (ex < 0 ? -6 : 6), -11 - 5 * open)
      ctx.stroke()
    }
  }

  // Нос — короткий крючок
  ctx.strokeStyle = ILLUSTRATION.skinShade
  ctx.lineWidth = 3.6
  ctx.beginPath()
  ctx.moveTo(-1, 9)
  ctx.quadraticCurveTo(6, 17, -3, 20)
  ctx.stroke()

  // Улыбка: дуга растёт и по глубине, и по ширине; после половины пути
  // внутри появляются зубы белой заливкой
  const mouthCurve = interp(f, T.smile[0], T.smile[1], 4, 22, easeOut)
  const mouthWidth = interp(f, T.smile[0], T.smile[1], 13, 21, easeOut)
  const my = shape.chin * 0.58
  if (smile > 0.5) {
    ctx.fillStyle = palette.surface
    ctx.beginPath()
    ctx.moveTo(-mouthWidth, my)
    ctx.quadraticCurveTo(0, my + mouthCurve, mouthWidth, my)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = colors.lip
  ctx.lineWidth = 4.4
  ctx.beginPath()
  ctx.moveTo(-mouthWidth, my)
  ctx.quadraticCurveTo(0, my + mouthCurve, mouthWidth, my)
  ctx.stroke()
  ctx.restore()

  /* --- значок состояния у головы --- */
  const badge = interp(f, T.badge[0], T.badge[1], 0, 1, easeBack)
  if (badge > 0.01) {
    ctx.save()
    ctx.translate(74, -336)
    ctx.scale(badge, badge)
    ctx.shadowColor = rgba(state.rgb, 0.5)
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 6
    ctx.fillStyle = state.main

    if (frame.failed) {
      // ФИГУРА, А НЕ ТОЛЬКО ЦВЕТ: круг с галочкой становится скруглённым
      // треугольником с «!». Контраст success к danger около 1.5 — по цвету
      // состояние не различить ни при дальтонизме, ни на ч/б печати.
      warningTrianglePath(ctx, 0, 2, 33)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.strokeStyle = palette.brandInk
      ctx.lineWidth = 5
      warningTrianglePath(ctx, 0, 2, 33)
      ctx.stroke()
      ctx.lineWidth = 5.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.fillStyle = palette.brandInk
      gBang(ctx, 0, 4, 42)
    } else {
      circlePath(ctx, 0, 0, 29)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.strokeStyle = palette.brandInk
      ctx.lineWidth = 5
      circlePath(ctx, 0, 0, 29)
      ctx.stroke()
      ctx.lineWidth = 5.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      gCheck(ctx, 0, 0, 42)
    }
    ctx.restore()
  }

  ctx.restore()
}
