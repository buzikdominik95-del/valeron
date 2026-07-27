/**
 * Интерфейсный слой сцены: надпись, сумма, чипы, подписи узлов, три шага,
 * полоса прогресса с остатком и процентами, нижний ряд гарантий.
 *
 * ВСЕ ЧИСЛА ЗДЕСЬ ПРИХОДЯТ ИЗ ПРОПОВ, а не из номера кадра. В эталоне полоса
 * росла от I(f, T.prog), процент считался от неё же, а остаток печатался как
 * 298·(1-p) — то есть время выдумывалось из позиции в цикле. Цикл сцены живёт
 * 10 секунд, перевод идёт минутами: врать пользователю про «осталось 2:14»
 * нельзя, поэтому из кадра осталась ТОЛЬКО раскадровка иллюстрации.
 *
 * ТРИ ЯРУСА ЧИТАЕМОСТИ. Эталон набран на 1920, а у нас канвас 744 CSS-px на
 * настольном экране и ~322 на телефоне — масштаб 0.39 и 0.17. Иллюстрация
 * масштабируется прекрасно, текст нет: надпись 20px превратилась бы в 7.8px,
 * а на телефоне в 3.4px. Поэтому каждому кеглю задан ПОЛ ЧИТАЕМОСТИ в
 * CSS-пикселях, а геометрия элемента растёт вместе со своим текстом.
 */

import {
  BANK,
  DESIGN_H,
  DESIGN_W,
  HUB,
  PER,
  STEP_AT,
} from '@/features/account/scene/transfer-timeline'
import {
  circlePath,
  clamp,
  roundRectPath,
  text,
  textWidth,
  trackedText,
  WEIGHT_BOLD,
  WEIGHT_NORMAL,
} from '@/features/account/scene/draw-utils'
import {
  gBankMini,
  gBolt,
  gCard,
  gClock,
  gDash,
  gGlobe,
  gLock,
  gReceipt,
  gShield,
  gUserMini,
} from '@/features/account/scene/draw-glyphs'
import type { Glyph } from '@/features/account/scene/draw-glyphs'
import type { ScenePalette, StateColors } from '@/features/account/scene/transfer-palette'

/** Ярус читаемости. Границы в CSS-пикселях ширины канваса. */
export type OverlayTier = 'full' | 'compact' | 'minimal'

const TIER_FULL_FROM = 960
const TIER_COMPACT_FROM = 560

export function overlayTier(cssWidth: number): OverlayTier {
  if (cssWidth >= TIER_FULL_FROM) return 'full'
  if (cssWidth >= TIER_COMPACT_FROM) return 'compact'
  return 'minimal'
}

/** Сумма, разобранная на две ступени набора. */
export interface AmountParts {
  /** Цифры с разделителями групп — крупный кегль. */
  digits: string
  /** Символ валюты — малый кегль. Пустая строка, если локаль его не дала. */
  symbol: string
  /** Символ идёт перед цифрами (в it/ru — после, но код не полагается на это). */
  symbolBefore: boolean
}

/** Тексты слоя. Все до единого — из локали; литералов в модуле нет. */
export interface OverlayTexts {
  overline: string
  amount: AmountParts
  chipProtected: string
  chipInstant: string
  bankName: string
  bankIban: string
  hubName: string
  hubCaption: string
  personName: string
  personIban: string
  steps: readonly [string, string, string]
  remainLabel: string
  remainValue: string
  pct: string
  trust: readonly [string, string, string, string]
}

export interface OverlayFrame {
  /** Прогресс перевода из пропов, 0…1. */
  progress: number
  failed: boolean
  /** Появление слоя, 0…1. Считается от МОНОТОННОГО счётчика кадров, а не от
      циклического: иначе сумма и процент моргали бы каждые 10 секунд. */
  appear: number
  /** Всплеск кольца у каждого шага, 0…1. Тоже монотонный: срабатывает один
      раз при смене состояния, а не на каждом обороте цикла. */
  stepPop: readonly [number, number, number]
  /** Ширина канваса в CSS-пикселях — от неё зависит ярус и полы кеглей. */
  cssWidth: number
}

/** Кегли и производная от них геометрия в единицах эталона. */
interface OverlayMetrics {
  tier: OverlayTier
  overline: number
  amountBig: number
  amountSmall: number
  amountY: number
  chip: number
  chipRatio: number
  caption: number
  captionSub: number
  captionSubY: number
  step: number
  stepRatio: number
  stepsY: number
  bar: number
  barY: number
  time: number
  timeY: number
  trust: number
  trustRatio: number
  trustY: number
}

/** Полосы прогресса и шагов стоят в этих границах — как в эталоне. */
const BAND_LEFT = 112
const BAND_RIGHT = 1808
const BAND_WIDTH = BAND_RIGHT - BAND_LEFT

/**
 * Пол читаемости по ролям, в CSS-пикселях. 11 — нижняя граница, на которой
 * подпись из двух слов ещё различима; 12 — для несущих строк (шаги, остаток);
 * 20 — для суммы, она главное число кадра.
 */
const MIN_CSS = {
  overline: 11,
  amount: 20,
  chip: 11.5,
  caption: 12,
  captionSub: 11,
  step: 12,
  time: 12,
  trust: 11,
} as const

function metricsFor(cssWidth: number): OverlayMetrics {
  const tier = overlayTier(cssWidth)
  const scale = cssWidth > 0 ? cssWidth / DESIGN_W : 1

  /** Кегль эталона, поднятый до пола читаемости. На широком канвасе floor
      ничего не меняет и слой выходит один-в-один эталонным. */
  const floor = (design: number, minCss: number): number =>
    Math.max(design, minCss / scale)

  const overline = floor(20, MIN_CSS.overline)
  const amountBig = floor(64, MIN_CSS.amount)
  const chip = floor(21, MIN_CSS.chip)
  const step = floor(23, MIN_CSS.step)
  const time = floor(22, MIN_CSS.time)
  const trust = floor(20, MIN_CSS.trust)

  const stepRatio = step / 23
  const timeRatio = time / 22
  const bar = 14 * timeRatio
  // Шаги без подписей поднимаются на место снятого ряда подписей узлов:
  // кружки в минимальном ярусе крупные и на 884 наехали бы на полосу.
  const stepsY = tier === 'minimal' ? 790 : 884
  const caption = floor(26, MIN_CSS.caption)
  const captionSub = floor(21, MIN_CSS.captionSub)

  /*
   * Отбивка от полосы до строки остатка и от неё до низа кадра.
   *
   * ПОЧЕМУ ПОЛОСА УМЕЕТ ПОДНИМАТЬСЯ. На очень узком канвасе (320px-телефон
   * отдаёт карточке около 250 CSS-px) пол читаемости поднимает кегль остатка
   * до 88 единиц эталона, и строка при эталонном barY = 934 уходила бы НИЖЕ
   * 1080 — то есть обрезалась бы краем кадра. Замерено: при 260 CSS-px низ
   * строки оказывался на 1090. Поэтому полоса получает верхнюю границу, и
   * ниже неё вся пара «полоса + остаток» просто едет вверх; места там хватает,
   * потому что в минимальном ярусе сняты и подписи узлов, и ряд гарантий.
   *
   * В обоих широких ярусах max/min не срабатывают, и barY равен эталонным 934.
   */
  const gapToTime = Math.max(46, time * 0.86)
  const bottomRoom = DESIGN_H - 8 - time * 0.26 - gapToTime - bar
  const barY = Math.min(934, bottomRoom)
  const timeY = barY + bar + gapToTime

  return {
    tier,
    overline,
    amountBig,
    amountSmall: amountBig * (40 / 64),
    // Базовая линия суммы отсчитывается от надписи: при выросшем кегле
    // эталонные 196 наложили бы верх цифр на надпись над ними.
    amountY: 120 + Math.max(76, amountBig * 0.86),
    chip,
    chipRatio: chip / 21,
    caption,
    captionSub,
    /*
     * Все три сдвига ниже устроены одинаково: max(эталонное число, требуемое
     * по фактическому кеглю). На широком канвасе, где кегли не поднимались,
     * max отдаёт РОВНО эталонное значение, и слой выходит один-в-один
     * присланным (проверено: при 1104 CSS-px все три равны 812 / 1032 и
     * ни один кегль не отличается от эталонного). Двигаются они только там,
     * где текст пришлось увеличить ради читаемости, — иначе подпись узла
     * налезла бы на свою же вторую строку, а ряд гарантий на строку остатка.
     */
    captionSubY: Math.max(812, 780 + caption * 0.34 + captionSub * 0.78),
    step,
    stepRatio,
    stepsY,
    bar,
    barY,
    time,
    timeY,
    trust,
    trustRatio: trust / 20,
    trustY: Math.max(1032, timeY + time * 0.42 + trust * 0.9),
  }
}

/**
 * Чип-капсула, прижатая правым краем к x. Возвращает свою ширину — следующий
 * чип встаёт левее на неё, как в эталоне.
 */
function chip(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  state: StateColors,
  x: number,
  y: number,
  label: string,
  glyph: Glyph,
  toned: boolean,
  size: number,
  ratio: number,
): number {
  const pad = 22 * ratio
  const h = 48 * ratio
  const width = textWidth(ctx, label, size, WEIGHT_BOLD, palette.font) + pad * 2 + 30 * ratio

  ctx.save()
  ctx.fillStyle = toned ? state.soft : palette.tint.faintest
  roundRectPath(ctx, x - width, y - h / 2, width, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = toned ? state.line : palette.line
  ctx.lineWidth = 2 * ratio
  roundRectPath(ctx, x - width, y - h / 2, width, h, h / 2)
  ctx.stroke()

  ctx.strokeStyle = toned ? state.main : palette.brand
  ctx.fillStyle = toned ? state.main : palette.brand
  ctx.lineWidth = 2.4 * ratio
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  glyph(ctx, x - width + pad + 9 * ratio, y, 24 * ratio)

  text(
    ctx,
    label,
    x - width + pad + 28 * ratio,
    y + 7 * ratio,
    size,
    WEIGHT_BOLD,
    toned ? state.main : palette.mid,
    palette.font,
  )
  ctx.restore()
  return width
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  state: StateColors,
  texts: OverlayTexts,
  frame: OverlayFrame,
): void {
  const m = metricsFor(frame.cssWidth)
  const progress = clamp(frame.progress, 0, 1)
  const done = progress >= 1 && !frame.failed

  /* --- надпись и сумма --- */
  ctx.save()
  ctx.globalAlpha = frame.appear
  trackedText(
    ctx,
    texts.overline,
    BAND_LEFT,
    120,
    m.overline,
    WEIGHT_BOLD,
    palette.faint,
    palette.font,
    0.16,
  )

  // Двухъярусный набор суммы: цифры крупно, символ валюты мельче. Разбор на
  // части делает компонент через Intl.formatToParts — n() отдаёт одну строку,
  // и вытащить из неё символ обратно нельзя.
  const digitsWidth = textWidth(ctx, texts.amount.digits, m.amountBig, WEIGHT_BOLD, palette.font)
  const gap = textWidth(ctx, ' ', m.amountBig, WEIGHT_BOLD, palette.font)
  const symbolWidth =
    texts.amount.symbol === ''
      ? 0
      : textWidth(ctx, texts.amount.symbol, m.amountSmall, WEIGHT_BOLD, palette.font)

  const digitsX = texts.amount.symbolBefore ? BAND_LEFT + symbolWidth + gap : BAND_LEFT
  const symbolX = texts.amount.symbolBefore ? BAND_LEFT : BAND_LEFT + digitsWidth + gap

  text(
    ctx,
    texts.amount.digits,
    digitsX,
    m.amountY,
    m.amountBig,
    WEIGHT_BOLD,
    palette.ink,
    palette.font,
  )
  if (texts.amount.symbol !== '') {
    text(
      ctx,
      texts.amount.symbol,
      symbolX,
      m.amountY,
      m.amountSmall,
      WEIGHT_BOLD,
      palette.mid,
      palette.font,
    )
  }

  // Чипы. В узких ярусах сняты: они стоят в одной строке с суммой, и при
  // поднятых кеглях места на обоих уже нет.
  if (m.tier === 'full' || m.tier === 'compact') {
    let rx = BAND_RIGHT
    const first = chip(
      ctx,
      palette,
      state,
      rx,
      128,
      texts.chipProtected,
      gShield,
      true,
      m.chip,
      m.chipRatio,
    )
    rx -= first + 14 * m.chipRatio
    chip(ctx, palette, state, rx, 128, texts.chipInstant, gBolt, false, m.chip, m.chipRatio)
  }
  ctx.restore()

  /* --- подписи узлов --- */
  /*
   * Снимаются ТОЛЬКО в минимальном ярусе. Изначально они были в плане
   * привязаны к полному, но замер показал, что полный ярус (≥960 CSS-px) в
   * раскладке кабинета НЕ ДОСТИГАЕТСЯ НИКОГДА: колонка отдаёт канвасу
   * 650…746 px. Подписи узлов и ряд гарантий пропали бы на всех настольных
   * ширинах — то есть владелец продукта увидел бы сцену БЕДНЕЕ присланной, а именно
   * за упрощения две предыдущие попытки и забраковали. Геометрия проверена
   * checkOverlayFit на обеих локалях: на 560…1440 подписи не сходятся.
   */
  if (m.tier !== 'minimal') {
    ctx.save()
    ctx.globalAlpha = frame.appear
    const glyphSize = 22 * (m.captionSub / 21)
    const caption = (x: number, title: string, sub: string, glyph: Glyph): void => {
      text(ctx, title, x, 780, m.caption, WEIGHT_BOLD, palette.mid, palette.font, 'center')
      const width = textWidth(ctx, sub, m.captionSub, WEIGHT_NORMAL, palette.font)
      ctx.strokeStyle = palette.faint
      ctx.lineWidth = 2 * (m.captionSub / 21)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      // Значок стоит слева от второй строки и вместе с ней образует
      // центрированную пару: отсюда сдвиг на половину ширины строки.
      glyph(ctx, x - width / 2 - glyphSize * 0.73, m.captionSubY - glyphSize * 0.32, glyphSize)
      text(
        ctx,
        sub,
        x - width / 2 + 4 * (m.captionSub / 21),
        m.captionSubY,
        m.captionSub,
        WEIGHT_NORMAL,
        palette.faint,
        palette.font,
      )
    }
    caption(BANK.x, texts.bankName, texts.bankIban, gCard)
    caption(HUB.x, texts.hubName, texts.hubCaption, gGlobe)
    caption(PER.x, texts.personName, texts.personIban, gShield)
    ctx.restore()
  }

  /* --- три шага --- */
  // Состояние берётся из ПРОГРЕССА, а не из кадра. Третий шаг при отказе не
  // загорается никогда: STEP_AT[2] = 1, а при failed он ещё и снимается ниже.
  const lit: readonly [boolean, boolean, boolean] = [
    progress >= STEP_AT[0],
    progress >= STEP_AT[1],
    progress >= STEP_AT[2] && !frame.failed,
  ]
  const stepGlyphs: readonly [Glyph, Glyph, Glyph] = [gBankMini, gShield, gUserMini]
  const withLabels = m.tier !== 'minimal'
  const radius = 22 * m.stepRatio

  for (let i = 0; i < 3; i += 1) {
    const label = texts.steps[i] ?? ''
    const isLit = lit[i] ?? false
    const pop = frame.stepPop[i] ?? 0
    const labelWidth = withLabels
      ? textWidth(ctx, label, m.step, WEIGHT_BOLD, palette.font)
      : 0
    const total = radius * 2 + (withLabels ? 22 * m.stepRatio + labelWidth : 0)
    // Первый прижат к левому краю полосы, второй центрирован, третий — к правому
    const x0 = i === 0 ? BAND_LEFT : i === 1 ? 960 - total / 2 : BAND_RIGHT - total
    const y = m.stepsY

    ctx.save()
    ctx.fillStyle = isLit ? state.soft : palette.tint.faintest
    circlePath(ctx, x0 + radius, y, radius)
    ctx.fill()
    ctx.strokeStyle = isLit ? state.line : palette.line
    ctx.lineWidth = 2.2 * m.stepRatio
    circlePath(ctx, x0 + radius, y, radius)
    ctx.stroke()

    // Всплеск при зажигании
    if (isLit && pop > 0 && pop < 1) {
      ctx.save()
      ctx.globalAlpha = (1 - pop) * 0.6
      ctx.strokeStyle = state.main
      ctx.lineWidth = 3 * m.stepRatio
      circlePath(ctx, x0 + radius, y, radius + pop * 16 * m.stepRatio)
      ctx.stroke()
      ctx.restore()
    }

    ctx.strokeStyle = isLit ? state.main : palette.faint
    ctx.fillStyle = isLit ? state.main : palette.faint
    ctx.lineWidth = 2.4 * m.stepRatio
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Третий шаг при отказе получает ПРОЧЕРК вместо человечка: пустой кружок
    // читался бы как «ещё не дошли», а перевод уже не дойдёт.
    const glyph = frame.failed && i === 2 ? gDash : stepGlyphs[i]
    if (glyph) glyph(ctx, x0 + radius, y, 24 * m.stepRatio)

    if (withLabels) {
      text(
        ctx,
        label,
        x0 + radius * 2 + 22 * m.stepRatio,
        y + 8 * m.stepRatio,
        m.step,
        WEIGHT_BOLD,
        isLit ? palette.mid : palette.faint,
        palette.font,
      )
    }
    ctx.restore()
  }

  /* --- полоса прогресса --- */
  const barRadius = m.bar / 2
  ctx.fillStyle = palette.track
  roundRectPath(ctx, BAND_LEFT, m.barY, BAND_WIDTH, m.bar, barRadius)
  ctx.fill()

  if (progress > 0) {
    const filled = BAND_WIDTH * progress
    const gradient = ctx.createLinearGradient(BAND_LEFT, 0, BAND_LEFT + BAND_WIDTH, 0)
    gradient.addColorStop(0, palette.brand)
    // Светлый конец градиента: здесь нужна СВЕТЛОТА, и на неё есть токен.
    // accent-dim не подошёл бы — он темнее accent, и полоса темнела бы вправо.
    gradient.addColorStop(1, palette.lineStrong)
    ctx.fillStyle = frame.failed ? state.main : done ? state.main : gradient
    roundRectPath(ctx, BAND_LEFT, m.barY, filled, m.bar, barRadius)
    ctx.fill()

    // При отказе торец полосы зубчатый: цвет один состояние не передаёт.
    if (frame.failed) {
      const end = BAND_LEFT + filled
      const notch = m.bar * 0.55
      const stepH = m.bar / 3
      ctx.fillStyle = palette.track
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath()
        ctx.moveTo(end, m.barY + i * stepH)
        ctx.lineTo(end - notch, m.barY + (i + 0.5) * stepH)
        ctx.lineTo(end, m.barY + (i + 1) * stepH)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  /* --- остаток времени и процент --- */
  ctx.strokeStyle = palette.faint
  ctx.lineWidth = 2 * (m.time / 22)
  ctx.lineCap = 'round'
  gClock(ctx, BAND_LEFT + 11 * (m.time / 22), m.timeY - 8 * (m.time / 22), 22 * (m.time / 22))
  const labelX = BAND_LEFT + 30 * (m.time / 22)
  // Эталонный C.muted (#8a95bd) — по таблице соответствий это --color-faint
  text(ctx, texts.remainLabel, labelX, m.timeY, m.time, WEIGHT_NORMAL, palette.faint, palette.font)
  const labelWidth = textWidth(ctx, `${texts.remainLabel} `, m.time, WEIGHT_NORMAL, palette.font)
  text(
    ctx,
    texts.remainValue,
    labelX + labelWidth,
    m.timeY,
    m.time,
    WEIGHT_BOLD,
    frame.failed ? state.main : done ? state.main : palette.brand,
    palette.font,
  )
  text(
    ctx,
    texts.pct,
    BAND_RIGHT,
    m.timeY,
    m.time,
    WEIGHT_BOLD,
    frame.failed ? state.main : done ? state.main : palette.faint,
    palette.font,
    'right',
  )

  /* --- нижний ряд гарантий --- */
  // Снимается только в минимальном ярусе — см. пояснение у подписей узлов.
  if (m.tier !== 'minimal') {
    const items: readonly [string, Glyph][] = [
      [texts.trust[0], gLock],
      [texts.trust[1], gShield],
      [texts.trust[2], gBolt],
      [texts.trust[3], gReceipt],
    ]
    const widths = items.map(
      ([label]) =>
        textWidth(ctx, label, m.trust, WEIGHT_NORMAL, palette.font) + (26 + 34) * m.trustRatio,
    )
    let total = 0
    for (const width of widths) total += width

    let x = (DESIGN_W - total) / 2
    const y = m.trustY
    ctx.save()
    // 0.95 — ряд намеренно чуть тише прочего слоя: это сноска, не сообщение
    ctx.globalAlpha = frame.appear * 0.95
    items.forEach(([label, glyph], i) => {
      // Эталон держит здесь два разных серых (#b3bcda у значка и #9aa4c8 у
      // подписи), у нас на оба места один --color-faint: ступень иерархии
      // теряется, но опускать несущий текст ниже порога контраста нельзя.
      ctx.strokeStyle = palette.faint
      ctx.fillStyle = palette.faint
      ctx.lineWidth = 2 * m.trustRatio
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      glyph(ctx, x + 11 * m.trustRatio, y - 7 * m.trustRatio, 22 * m.trustRatio)
      text(
        ctx,
        label,
        x + 30 * m.trustRatio,
        y,
        m.trust,
        WEIGHT_NORMAL,
        palette.faint,
        palette.font,
      )
      x += widths[i] ?? 0
    })
    ctx.restore()
  }
}

/**
 * Проверка раскладки слоя для dev-консоли.
 *
 * Итальянские подписи длиннее русских («Addebitato / Verificato / Accreditato»
 * против «Списано / Проверено / Зачислено»), а тройка шагов стоит впритык:
 * первый прижат к 112, второй центрирован по 960, третий к 1808. Если тройка
 * вышла из полосы или ряд гарантий не влез в кадр, это надо увидеть числом,
 * а не заметить глазом на скриншоте.
 *
 * @returns список найденных нарушений; пустой список — раскладка сошлась
 */
export function checkOverlayFit(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  texts: OverlayTexts,
  cssWidth: number,
): string[] {
  const m = metricsFor(cssWidth)
  const problems: string[] = []

  // Строка остатка — нижняя строка в узких ярусах, и обрезаться она не должна
  const timeBottom = m.timeY + m.time * 0.26
  if (timeBottom > DESIGN_H) {
    problems.push(`строка остатка вышла за кадр: низ на ${Math.round(timeBottom)} против ${DESIGN_H}`)
  }
  // Полоса не должна наезжать на кружки шагов, когда те подняты
  const stepBottom = m.stepsY + 22 * m.stepRatio
  if (stepBottom > m.barY) {
    problems.push(
      `шаги наезжают на полосу: низ кружка ${Math.round(stepBottom)}, верх полосы ${Math.round(m.barY)}`,
    )
  }

  if (m.tier !== 'minimal') {
    const radius = 22 * m.stepRatio
    const widths = texts.steps.map(
      (label) =>
        radius * 2 + 22 * m.stepRatio + textWidth(ctx, label, m.step, WEIGHT_BOLD, palette.font),
    )
    const first = widths[0] ?? 0
    const second = widths[1] ?? 0
    const third = widths[2] ?? 0
    // Между шагами нужен зазор: слипшиеся подписи читаются как одна строка
    const minGap = 24 * m.stepRatio
    if (BAND_LEFT + first + minGap > 960 - second / 2) {
      problems.push(
        `шаги 1 и 2 сходятся: первый кончается на ${Math.round(BAND_LEFT + first)}, второй начинается на ${Math.round(960 - second / 2)}`,
      )
    }
    if (960 + second / 2 + minGap > BAND_RIGHT - third) {
      problems.push(
        `шаги 2 и 3 сходятся: второй кончается на ${Math.round(960 + second / 2)}, третий начинается на ${Math.round(BAND_RIGHT - third)}`,
      )
    }
  }

  if (m.tier !== 'minimal') {
    let total = 0
    for (const label of texts.trust) {
      total += textWidth(ctx, label, m.trust, WEIGHT_NORMAL, palette.font) + (26 + 34) * m.trustRatio
    }
    if (total > DESIGN_W - BAND_LEFT * 2) {
      problems.push(`ряд гарантий шире полосы: ${Math.round(total)} против ${DESIGN_W - BAND_LEFT * 2}`)
    }
    // Ряд гарантий — последняя строка кадра; ниже 1080 её быть не должно
    const trustBottom = m.trustY + m.trust * 0.26
    if (trustBottom > DESIGN_H) {
      problems.push(`ряд гарантий вышел за кадр: низ на ${Math.round(trustBottom)} против ${DESIGN_H}`)
    }

    const chipWidth = (label: string): number =>
      textWidth(ctx, label, m.chip, WEIGHT_BOLD, palette.font) + (22 * 2 + 30) * m.chipRatio
    const chipsTotal = chipWidth(texts.chipProtected) + chipWidth(texts.chipInstant) + 14 * m.chipRatio
    const amountEnd =
      BAND_LEFT +
      textWidth(ctx, texts.amount.digits, m.amountBig, WEIGHT_BOLD, palette.font) +
      textWidth(ctx, ` ${texts.amount.symbol}`, m.amountSmall, WEIGHT_BOLD, palette.font)
    if (BAND_RIGHT - chipsTotal < amountEnd + 40) {
      problems.push(
        `чипы наезжают на сумму: чипы начинаются на ${Math.round(BAND_RIGHT - chipsTotal)}, сумма кончается на ${Math.round(amountEnd)}`,
      )
    }

    // Подписи узлов: три пары стоят под своими фигурами и не должны слипаться.
    // Ширина пары — по более длинной из двух строк, вторая ещё несёт значок.
    const captionSpans = (
      [
        [BANK.x, texts.bankName, texts.bankIban],
        [HUB.x, texts.hubName, texts.hubCaption],
        [PER.x, texts.personName, texts.personIban],
      ] as const
    ).map(([x, title, sub]) => {
      const titleWidth = textWidth(ctx, title, m.caption, WEIGHT_BOLD, palette.font)
      const subWidth =
        textWidth(ctx, sub, m.captionSub, WEIGHT_NORMAL, palette.font) + 22 * (m.captionSub / 21)
      const half = Math.max(titleWidth, subWidth) / 2
      return { x, from: x - half, to: x + half }
    })
    for (let i = 0; i + 1 < captionSpans.length; i += 1) {
      const left = captionSpans[i]
      const right = captionSpans[i + 1]
      if (!left || !right) continue
      if (left.to + 20 > right.from) {
        problems.push(
          `подписи узлов ${i + 1} и ${i + 2} сходятся: ${Math.round(left.to)} против ${Math.round(right.from)}`,
        )
      }
    }
    // Подписи не должны налезать на кружки шагов снизу
    const stepTop = m.stepsY - 22 * m.stepRatio
    const captionBottom = m.captionSubY + m.captionSub * 0.26
    if (captionBottom > stepTop) {
      problems.push(
        `подписи узлов наезжают на шаги: низ подписи ${Math.round(captionBottom)}, верх кружка ${Math.round(stepTop)}`,
      )
    }
  }

  return problems
}
