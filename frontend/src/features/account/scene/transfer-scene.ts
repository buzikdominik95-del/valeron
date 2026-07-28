/**
 * Сборка кадра сцены перевода и её состояние во времени.
 *
 * Без Vue: ни одного ref, только вызовы 2d-контекста. Компоненту остаётся
 * единственный вопрос — КОГДА рисовать (тот же приём, что в hero-canvas-scene
 * и signature-canvas).
 */

import {
  DESIGN_H,
  DESIGN_W,
  FPS,
  LOOP_FRAMES,
  STATIC_FRAME,
  STEP_AT,
  TOTAL_FRAMES,
} from '@/features/account/scene/transfer-timeline'
import { clamp, easeBack, easeOut, interp } from '@/features/account/scene/draw-utils'
import { drawBackground } from '@/features/account/scene/draw-background'
import type { BackgroundColors } from '@/features/account/scene/draw-background'
import { drawBank, drawCard } from '@/features/account/scene/draw-bank'
import { drawHub } from '@/features/account/scene/draw-hub'
import { drawPerson } from '@/features/account/scene/draw-person'
import { drawWallet } from '@/features/account/scene/draw-wallet'
import { drawCreditBadge, drawFlying, drawImpulse } from '@/features/account/scene/draw-coins'
import { checkOverlayFit, drawOverlay } from '@/features/account/scene/draw-overlay'
import type { OverlayTexts } from '@/features/account/scene/draw-overlay'
import { stateColors } from '@/features/account/scene/transfer-palette'
import type {
  SceneBrandShades,
  SceneLook,
  ScenePalette,
} from '@/features/account/scene/transfer-palette'

/** Всё, что нужно знать о состоянии перевода прямо сейчас. Приходит из пропов. */
export interface SceneFrame {
  /** Прогресс перевода, 0…1. */
  progress: number
  failed: boolean
  look: SceneLook
  /** Ширина канваса в CSS-пикселях; от неё зависит ярус интерфейсного слоя. */
  cssWidth: number
  /** Высота канваса в CSS-пикселях — для contain-scale (не срезать 16:9). */
  cssHeight: number
  /** Плотность экрана. */
  ratio: number
  /** Тексты слоя и надпись на банке — целиком из локали. */
  texts: OverlayTexts
  bankSign: string
  /** Готовая строка «+10 000 €» для плашки зачисления. */
  creditLabel: string
}

/**
 * Состояние сцены между кадрами. Обычный объект вне реактивности: Vue завёл бы
 * прокси на каждое поле, а читаются они по разу в кадр и меняются чаще.
 */
export interface SceneRuntime {
  /** Накопленные секунды. Растут только из delta: пока сцена на паузе, время
      стоит, и возврат на вкладку не даёт скачка фазы колыхания флага. */
  elapsed: number
  /** Последний нарисованный кадр раскадровки; -1 — ещё ни одного. */
  lastFrame: number
  /**
   * МОНОТОННЫЙ счётчик кадров с монтирования. Не циклический: появление
   * интерфейсного слоя и всплеск кольца у шага обязаны сработать ОДИН РАЗ.
   * Эталонная drawUI гасит слой на первых 14 кадрах — в цикле длиной 310
   * кадров это значило бы, что настоящая сумма и настоящий процент моргают
   * каждые десять секунд.
   */
  totalFrames: number
  /** Кадр, на котором каждый шаг зажёгся впервые; null — ещё не зажёгся. */
  stepLitAt: [number | null, number | null, number | null]
  /** Дев-проверка раскладки уже отработала: ругаться на каждом кадре незачем. */
  fitChecked: boolean
}

export function createSceneRuntime(): SceneRuntime {
  return {
    elapsed: 0,
    lastFrame: -1,
    totalFrames: 0,
    stepLitAt: [null, null, null],
    fitChecked: false,
  }
}

/**
 * Кадр раскадровки по накопленным секундам.
 *
 * Держка в конце цикла перенесена из эталона буквально: цикл длиной
 * TOTAL + 40, а рисуется min(f, TOTAL) — то есть 40 кадров (1,33 с) стоит
 * собранный финальный кадр. Без неё сцена щёлкала бы обратно мгновенно.
 */
export function frameAt(elapsed: number): number {
  const f = (elapsed * FPS) % LOOP_FRAMES
  return Math.min(f, TOTAL_FRAMES)
}

/**
 * Приводит буфер канваса к физическим пикселям.
 *
 * Присваивание width/height обнуляет холст вместе с матрицей преобразования,
 * поэтому размер трогаем ТОЛЬКО когда он изменился, а рисование всегда идёт
 * следом отдельным вызовом drawTransferFrame.
 *
 * @returns true, если буфер действительно пересобран
 */
export function resizeSceneBuffer(
  element: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  ratio: number,
): boolean {
  if (cssWidth <= 0 || cssHeight <= 0) return false
  const density = ratio || 1
  const width = Math.round(cssWidth * density)
  const height = Math.round(cssHeight * density)

  let changed = false
  if (element.width !== width) {
    element.width = width
    changed = true
  }
  if (element.height !== height) {
    element.height = height
    changed = true
  }
  return changed
}

/** Кадр для prefers-reduced-motion: сцена собрана, движения нет. */
export const REDUCED_MOTION_FRAME = STATIC_FRAME

/**
 * Обновляет монотонные счётчики. Зовётся ровно один раз на нарисованный кадр,
 * до самой отрисовки.
 */
export function advanceRuntime(runtime: SceneRuntime, progress: number, failed: boolean): void {
  runtime.totalFrames += 1
  const lit: readonly boolean[] = [
    progress >= STEP_AT[0],
    progress >= STEP_AT[1],
    progress >= STEP_AT[2] && !failed,
  ]
  for (let i = 0; i < 3; i += 1) {
    if (lit[i] === true && runtime.stepLitAt[i] === null) runtime.stepLitAt[i] = runtime.totalFrames
    // Отказ гасит третий шаг: если он успел зажечься, счётчик надо снять,
    // иначе повторное зажигание не даст всплеска.
    if (lit[i] !== true && runtime.stepLitAt[i] !== null) runtime.stepLitAt[i] = null
  }
}

/**
 * Ставит счётчики в состояние «слой давно проявлен, всплески отыграли».
 *
 * Нужно для prefers-reduced-motion: там рисуется ЕДИНСТВЕННЫЙ кадр, и
 * появление слоя отыгрывать нечем — без этого сумма и процент остались бы
 * прозрачными, то есть картинка потеряла бы все настоящие числа.
 */
export function settleRuntime(runtime: SceneRuntime, progress: number, failed: boolean): void {
  runtime.totalFrames = 60
  const lit: readonly boolean[] = [
    progress >= STEP_AT[0],
    progress >= STEP_AT[1],
    progress >= STEP_AT[2] && !failed,
  ]
  // Кадр 1 при счётчике 60 — всплеск уже погас, кружок просто зажжён
  for (let i = 0; i < 3; i += 1) runtime.stepLitAt[i] = lit[i] === true ? 1 : null
}

/** Всплеск кольца у шага: 0…1 за 12 кадров с момента зажигания. */
function stepPopValues(runtime: SceneRuntime): [number, number, number] {
  const value = (at: number | null): number =>
    at === null ? 0 : interp(runtime.totalFrames, at, at + 12, 0, 1, easeBack)
  return [value(runtime.stepLitAt[0]), value(runtime.stepLitAt[1]), value(runtime.stepLitAt[2])]
}

/**
 * ОДИН КАДР СЦЕНЫ.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ ПОРЯДОК СЛОЁВ НЕ ПЕРЕСТАВЛЯТЬ. Он несущая конструкция кадра, и ломается ║
 * ║ МОЛЧА — без единой ошибки сборки и типов:                               ║
 * ║   · летящие монеты идут ДО человека, потому что летят ЗА ним;           ║
 * ║     переставь — и монеты полетят поверх лица;                           ║
 * ║   · кошелёк идёт ПОСЛЕ человека, потому что висит ПЕРЕД грудью;         ║
 * ║     переставь — и он уедет за торс;                                     ║
 * ║   · карта рисуется после банка: она вылетает из него;                   ║
 * ║   · импульсы и искры — поверх кошелька: они бьют из него наружу;        ║
 * ║   · интерфейсный слой последним: он не должен ничем перекрываться.      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export function drawTransferFrame(
  element: HTMLCanvasElement,
  runtime: SceneRuntime,
  palette: ScenePalette,
  shades: SceneBrandShades,
  background: BackgroundColors,
  frame: SceneFrame,
  /** Кадр раскадровки. Отдельным аргументом: при reduced-motion он постоянный. */
  f: number,
): void {
  const ctx = element.getContext('2d')
  if (!ctx) return
  if (frame.cssWidth <= 0) return

  /*
   * Масштаб — min(ширина, высота) / эталон, letterbox по центру.
   * Раньше scale = cssWidth / DESIGN_W: при max-height < 16:9 низ
   * (банк/человек) срезался overflow. С contain-масштабом кадр всегда
   * целиком. Координаты draw-* — 1920×1080.
   */
  const density = frame.ratio || 1
  const cssH =
    frame.cssHeight > 0
      ? frame.cssHeight
      : frame.cssWidth * (DESIGN_H / DESIGN_W)
  const scale = Math.min(frame.cssWidth / DESIGN_W, cssH / DESIGN_H)
  const ox = ((frame.cssWidth - DESIGN_W * scale) / 2) * density
  const oy = ((cssH - DESIGN_H * scale) / 2) * density
  /* Чистим весь буфер в device-пикселях, не только design-rect */
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, element.width, element.height)
  ctx.setTransform(density * scale, 0, 0, density * scale, ox, oy)

  const state = stateColors(palette, frame.failed)

  drawBackground(ctx, palette, background)
  drawBank(ctx, f, palette, frame.bankSign)
  drawCard(ctx, f, palette, shades)
  drawHub(ctx, f, palette, shades)
  drawFlying(ctx, f, palette)
  drawPerson(ctx, f, palette, shades, state, { look: frame.look, failed: frame.failed })
  drawWallet(ctx, f, palette, shades)
  drawImpulse(ctx, f, palette, state, frame.failed)
  // Плашка «+сумма» при отказе не показывается вовсе: она заявляет зачисление
  if (!frame.failed) drawCreditBadge(ctx, f, palette, state, frame.creditLabel)

  drawOverlay(ctx, palette, state, frame.texts, {
    progress: frame.progress,
    failed: frame.failed,
    // Появление слоя — от монотонного счётчика, а не от циклического кадра
    appear: interp(runtime.totalFrames, 0, 14, 0, 1, easeOut),
    stepPop: stepPopValues(runtime),
    cssWidth: frame.cssWidth,
  })

  // Раскладка слоя проверяется один раз на смену размера: итальянские подписи
  // длиннее русских, и тройка шагов может сойтись впритык.
  if (import.meta.env.DEV && !runtime.fitChecked) {
    runtime.fitChecked = true
    const problems = checkOverlayFit(ctx, palette, frame.texts, frame.cssWidth)
    for (const problem of problems) {
      console.warn(`[VelTransferScene] раскладка интерфейсного слоя: ${problem}`)
    }
  }
}

/**
 * Двигает время сцены и говорит, нужно ли рисовать.
 *
 * КАДР КВАНТУЕТСЯ ДО 30 fps — так и задумано автором эталона: раскадровка
 * привязана к номеру кадра, а не к секундам. На 120-герцовом экране это в
 * четыре раза меньше работы, а сцена — сотни фигур и около двадцати
 * создаваемых градиентов за кадр.
 *
 * @param deltaMs миллисекунды из useRafFn; Date.now() здесь не используется
 * @returns номер кадра раскадровки или null, если рисовать пока нечего
 */
export function tickScene(runtime: SceneRuntime, deltaMs: number): number | null {
  // Верхняя граница delta — страховка от одного длинного кадра (сборка мусора,
  // подвисшая вкладка): без неё фаза перескочила бы на четверть цикла разом,
  // и это читалось бы как рывок, а не как пропущенный кадр.
  runtime.elapsed += clamp(deltaMs, 0, 250) / 1000
  const f = frameAt(runtime.elapsed)
  const whole = Math.floor(f)
  if (whole === runtime.lastFrame) return null
  runtime.lastFrame = whole
  return f
}
