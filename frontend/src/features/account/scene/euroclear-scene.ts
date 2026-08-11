/**
 * Сцена «Verifica Euroclear» (L5): инспектор с лупой проверяет
 * личный кабинет клиента. Порт standalone animation.html в canvas-модуль.
 * Данные клиента приходят из пропов (имя, инициалы, IBAN, сумма).
 */

export interface EuroclearSceneData {
  /** Полное имя клиента (подпись карточки). */
  name: string
  /** Инициалы клиента для аватара. */
  initials: string
  /** IBAN (маскированный или полный) для строки под именем. */
  iban: string
  /** Запрошенная сумма вывода, € (целое). */
  amountEuros: number
  /** Последний вывод в формате итальянского времени (например: Oggi · 14:22). */
  lastWithdrawalLabel: string
  /** Строка количества попыток (например: 5 operazioni). */
  attemptsLabel: string
}

export const EU_SCENE_W = 1920
export const EU_SCENE_H = 1080
export const EU_SCENE_TOTAL = 360

const W = EU_SCENE_W
const H = EU_SCENE_H
const TOTAL = EU_SCENE_TOTAL

let ctx: CanvasRenderingContext2D | null = null

export function setEuroclearSceneContext(c: CanvasRenderingContext2D | null): void {
  ctx = c
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)
const easeIO = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeBack = (t: number): number => {
  const c = 1.70158 + 1
  return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)
}

function I(
  f: number,
  f0: number,
  f1: number,
  v0: number,
  v1: number,
  ease?: (t: number) => number,
): number {
  if (f1 === f0) return f < f0 ? v0 : v1
  let t = clamp((f - f0) / (f1 - f0), 0, 1)
  t = ease ? ease(t) : t
  return v0 + (v1 - v0) * t
}

function rr(x: number, y: number, w: number, h: number, r: number | number[]): void {
  if (!ctx) return
  const rad = Array.isArray(r) ? r : [r, r, r, r]
  const [tl, tr, br, bl] = rad as [number, number, number, number]
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad)
    return
  }
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h)
  ctx.lineTo(x + bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl)
  ctx.lineTo(x, y + tl)
  ctx.quadraticCurveTo(x, y, x + tl, y)
  ctx.closePath()
}

function circ(x: number, y: number, r: number): void {
  if (!ctx) return
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

const F = '"Inter Variable", Inter, system-ui, sans-serif'

function txt(
  s: string,
  x: number,
  y: number,
  size: number,
  weight: string,
  color: string,
  align?: CanvasTextAlign,
  ls?: string,
): void {
  if (!ctx) return
  ctx.save()
  ctx.font = `${weight} ${size}px ${F}`
  ctx.fillStyle = color
  ctx.textAlign = align || 'left'
  ctx.textBaseline = 'alphabetic'
  if (ls) {
    try {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = ls
    } catch {
      /* ignore */
    }
  }
  ctx.fillText(s, x, y)
  ctx.restore()
}

function tw(s: string, size: number, weight: string): number {
  if (!ctx) return 0
  ctx.save()
  ctx.font = `${weight} ${size}px ${F}`
  const w = ctx.measureText(s).width
  ctx.restore()
  return w
}

const C = {
  navy: '#0b1f3a',
  navy2: '#163456',
  teal: '#00a3a1',
  ink: '#12233f',
  mid: '#3d5270',
  muted: '#7a8aa3',
  faint: '#a8b4c6',
  line: '#d9e2ee',
  paper: '#ffffff',
  ok: '#12b76a',
  okSoft: '#e9f9f0',
  warn: '#f59e0b',
  warnSoft: '#fff7e8',
  warnInk: '#b45309',
  skin: '#f4d3b6',
  skinSh: '#e5bb98',
}

interface SceneTimeline {
  fade: [number, number]
  card: [number, number]
  glass: [number, number]
  alert: [number, number]
  badge: [number, number]
  blinks: [number, number, number]
}

const T: SceneTimeline = {
  fade: [0, 22],
  card: [8, 32],
  glass: [24, TOTAL],
  alert: [40, 70],
  badge: [200, 240],
  blinks: [90, 190, 290],
}

const PER = { x: 1380, y: 600 }
const CARD = { x: 120, y: 200, w: 760, h: 600 }
const ARM_L = {
  shoulder: { x: -94, y: -158 },
  elbow: { x: -128, y: -42 },
  hand: { x: -178, y: 8 },
}

function shadowEllipse(x: number, y: number, rx: number, ry: number, a: number): void {
  if (!ctx) return
  ctx.save()
  ctx.globalAlpha = a
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx)
  g.addColorStop(0, 'rgba(11,31,58,.22)')
  g.addColorStop(1, 'rgba(11,31,58,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

function drawBG(): void {
  if (!ctx) return
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.55, '#f2f7fb')
  g.addColorStop(1, '#e5eef6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const r = ctx.createRadialGradient(W * 0.2, -80, 40, W * 0.2, -80, 820)
  r.addColorStop(0, 'rgba(0,163,161,.12)')
  r.addColorStop(1, 'rgba(0,163,161,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, W, H)
  const r2 = ctx.createRadialGradient(W * 0.85, H * 0.9, 40, W * 0.85, H * 0.9, 700)
  r2.addColorStop(0, 'rgba(11,31,58,.08)')
  r2.addColorStop(1, 'rgba(11,31,58,0)')
  ctx.fillStyle = r2
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.fillStyle = 'rgba(11,31,58,.04)'
  for (let x = 100; x < W - 80; x += 46)
    for (let y = 280; y < 820; y += 46) {
      ctx.beginPath()
      ctx.arc(x, y, 1.35, 0, 7)
      ctx.fill()
    }
  ctx.restore()
}

function drawLogo(f: number): void {
  if (!ctx) return
  const a = I(f, 0, 16, 0, 1, easeOut)
  ctx.save()
  ctx.globalAlpha = a
  ctx.translate(64, 48)
  rr(0, 0, 76, 76, 20)
  const lg = ctx.createLinearGradient(0, 0, 76, 76)
  lg.addColorStop(0, '#1a3a5c')
  lg.addColorStop(1, C.navy)
  ctx.fillStyle = lg
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.12)'
  ctx.lineWidth = 2
  rr(0, 0, 76, 76, 20)
  ctx.stroke()
  txt('E', 38, 52, 42, 'bold', '#fff', 'center', '-0.02em')
  ctx.beginPath()
  ctx.arc(38, 38, 28, -0.35, Math.PI * 1.15)
  ctx.strokeStyle = C.teal
  ctx.lineWidth = 4
  ctx.stroke()
  txt('Euroclear', 96, 28, 20, 'bold', C.muted, 'left', '0.06em')
  txt('VERIFICA EUROCLEAR', 96, 62, 38, 'bold', C.ink, 'left', '0.04em')
  txt(
    'Euroclear sta verificando la Sua transazione per valutare i rischi',
    96,
    98,
    24,
    'normal',
    C.mid,
    'left',
  )
  ctx.restore()
}

function scanPos(f: number): { x: number; y: number } {
  const phase = ((f - T.glass[0]) % 160) / 160
  const wave = easeIO(phase < 0.5 ? phase * 2 : 2 - phase * 2)
  const x = CARD.x + 80 + wave * (CARD.w - 160)
  const row = Math.floor(((f - T.glass[0]) % 160) / 32) % 5
  const y = CARD.y + 340 + row * 58 + Math.sin(f / 18) * 6
  return { x, y }
}

function handBob(f: number): { x: number; y: number } {
  return { x: Math.sin(f / 24) * 10, y: Math.cos(f / 20) * 8 }
}

function skinFill(x: number, y: number, r: number): CanvasGradient | string {
  if (!ctx) return C.skin
  const pg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r)
  pg.addColorStop(0, '#fae0c9')
  pg.addColorStop(1, C.skin)
  return pg
}

function drawRestHand(wx: number, wy: number, ang: number): void {
  if (!ctx) return
  ctx.save()
  ctx.translate(wx, wy)
  ctx.rotate(ang || 0.15)
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#b8825c'
  ctx.beginPath()
  ctx.ellipse(0, 4, 16, 17, 0, 0, 7)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = skinFill(-4, -4, 22)
  ctx.beginPath()
  ctx.ellipse(0, 0, 17, 19, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

function drawHeldMagnifier(wx: number, wy: number, f: number): void {
  if (!ctx) return
  const pulse = 1 + Math.sin(f / 12) * 0.01
  const lensR = 68
  const hy = 0
  ctx.save()
  ctx.translate(wx, wy)
  ctx.rotate(-0.05)
  ctx.scale(pulse, pulse)
  ctx.save()
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#8a6a4a'
  ctx.beginPath()
  ctx.ellipse(4, 22, 38, 14, 0, 0, 7)
  ctx.fill()
  ctx.restore()
  const lx = -108
  ctx.save()
  ctx.translate(lx, hy - 2)
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, lensR * 1.25)
  glow.addColorStop(0, 'rgba(0,163,161,.16)')
  glow.addColorStop(1, 'rgba(0,163,161,0)')
  ctx.fillStyle = glow
  circ(0, 0, lensR * 1.25)
  ctx.fill()
  ctx.lineWidth = 12
  ctx.strokeStyle = C.navy
  circ(0, 0, lensR)
  ctx.stroke()
  ctx.lineWidth = 3.5
  ctx.strokeStyle = C.teal
  circ(0, 0, lensR - 7)
  ctx.stroke()
  const glass = ctx.createRadialGradient(-14, -16, 3, 0, 0, lensR)
  glass.addColorStop(0, 'rgba(255,255,255,.58)')
  glass.addColorStop(0.5, 'rgba(190,230,232,.14)')
  glass.addColorStop(1, 'rgba(11,31,58,.05)')
  ctx.fillStyle = glass
  circ(0, 0, lensR - 9)
  ctx.fill()
  ctx.restore()
  const hTop = hy - 8
  const hH = 16
  const hLeft = lx + lensR - 3
  const hW = 130
  const hg = ctx.createLinearGradient(0, hTop, 0, hTop + hH)
  hg.addColorStop(0, '#244872')
  hg.addColorStop(0.5, C.navy2)
  hg.addColorStop(1, '#0a1830')
  ctx.fillStyle = hg
  rr(hLeft, hTop, hW, hH, 8)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.1)'
  rr(hLeft + 10, hTop + 2, hW - 40, 4, 2)
  ctx.fill()
  rr(hLeft + hW - 8, hy - 7, 22, 14, 7)
  ctx.fillStyle = C.teal
  ctx.fill()
  const fistX = 8
  const fistY = hy + 2
  ctx.fillStyle = skinFill(fistX, fistY + 8, 34)
  ctx.beginPath()
  ctx.ellipse(fistX + 2, fistY + 10, 28, 20, 0.05, 0, 7)
  ctx.fill()
  ctx.fillStyle = skinFill(fistX - 18, fistY + 6, 20)
  ctx.beginPath()
  ctx.ellipse(fistX - 20, fistY + 8, 16, 11, -0.35, 0, 7)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(fistX - 30, fistY + 2, 10, 8, -0.5, 0, 7)
  ctx.fill()
  ctx.fillStyle = skinFill(fistX, fistY - 6, 32)
  ctx.beginPath()
  ctx.ellipse(fistX + 4, fistY - 2, 26, 18, 0.02, 0, 7)
  ctx.fill()
  const knuckles = [
    { x: fistX - 14, r: 9.5 },
    { x: fistX - 2, r: 10.5 },
    { x: fistX + 10, r: 10 },
    { x: fistX + 21, r: 8.5 },
  ]
  knuckles.forEach((k, i) => {
    if (!ctx) return
    const ky = hTop - 2 + (i % 2) * 0.8
    ctx.fillStyle = skinFill(k.x - 2, ky - 4, k.r + 4)
    ctx.beginPath()
    ctx.ellipse(k.x, ky, k.r, k.r * 0.92, 0, 0, 7)
    ctx.fill()
    if (i < knuckles.length - 1) {
      ctx.strokeStyle = 'rgba(184,130,92,.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(k.x + k.r * 0.7, ky - 2)
      ctx.quadraticCurveTo(k.x + k.r + 2, ky + 6, k.x + k.r * 0.7, ky + 10)
      ctx.stroke()
    }
  })
  ctx.fillStyle = 'rgba(11,31,58,.35)'
  rr(fistX - 22, hy - 3, 48, 5, 2)
  ctx.fill()
  ctx.restore()
}

function drawAccountCard(f: number, gx: number, gy: number, data: EuroclearSceneData): void {
  if (!ctx) return
  const a = I(f, T.card[0], T.card[1], 0, 1, easeOut)
  const rise = I(f, T.card[0], T.card[1], 28, 0, easeBack)
  const { x, y, w, h } = CARD
  ctx.save()
  ctx.globalAlpha = a
  ctx.translate(0, rise)
  ctx.shadowColor = 'rgba(11,31,58,.12)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 16
  rr(x, y, w, h, 32)
  ctx.fillStyle = C.paper
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  rr(x, y, w, h, 32)
  ctx.stroke()
  rr(x, y, w, 8, [32, 32, 0, 0])
  ctx.fillStyle = C.teal
  ctx.fill()
  txt('CONTO PERSONALE', x + 40, y + 56, 18, 'bold', C.muted, 'left', '0.1em')
  txt('Area riservata', x + 40, y + 98, 40, 'bold', C.ink, 'left')
  circ(x + 78, y + 170, 38)
  const ag = ctx.createLinearGradient(x + 50, y + 140, x + 110, y + 200)
  ag.addColorStop(0, '#d7e8f5')
  ag.addColorStop(1, '#b7cfe4')
  ctx.fillStyle = ag
  ctx.fill()
  txt(data.initials, x + 78, y + 178, 22, 'bold', C.navy2, 'center')
  txt(data.name, x + 134, y + 160, 28, 'bold', C.ink, 'left')
  txt(data.iban, x + 134, y + 194, 20, 'normal', C.muted, 'left')
  const alertA = I(f, T.alert[0], T.alert[1], 0, 1, easeOut)
  ctx.save()
  ctx.globalAlpha = alertA
  rr(x + 32, y + 230, w - 64, 72, 18)
  ctx.fillStyle = C.warnSoft
  ctx.fill()
  ctx.strokeStyle = 'rgba(245,158,11,.45)'
  ctx.lineWidth = 2
  rr(x + 32, y + 230, w - 64, 72, 18)
  ctx.stroke()
  circ(x + 68, y + 266, 16)
  ctx.fillStyle = C.warn
  ctx.fill()
  txt('!', x + 68, y + 273, 22, 'bold', '#fff', 'center')
  txt('Tentativi di prelievo frequenti', x + 100, y + 258, 24, 'bold', C.warnInk, 'left')
  txt(
    'Euroclear ha avviato un controllo del rischio',
    x + 100,
    y + 288,
    18,
    'normal',
    C.warnInk,
    'left',
  )
  ctx.restore()
  const amountLabel = `€ ${new Intl.NumberFormat('it-IT').format(Math.max(0, Math.round(data.amountEuros)))}`
  const rows = [
    { k: 'Ultimo prelievo', v: data.lastWithdrawalLabel, hot: true },
    { k: 'Tentativi', v: data.attemptsLabel, hot: true },
    { k: 'Importo richiesto', v: amountLabel, hot: false },
    { k: 'Metodo', v: 'Bonifico SEPA Instant', hot: false },
    { k: 'Esito rischio', v: f > 250 ? 'In revisione' : 'Analisi…', hot: true },
  ]
  rows.forEach((row, i) => {
    if (!ctx) return
    const ry = y + 340 + i * 58
    const hit = Math.hypot(gx - (x + w * 0.55), gy - ry) < 70
    if (hit) {
      rr(x + 28, ry - 22, w - 56, 48, 14)
      ctx.fillStyle = 'rgba(0,163,161,.10)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,163,161,.28)'
      ctx.lineWidth = 1.6
      rr(x + 28, ry - 22, w - 56, 48, 14)
      ctx.stroke()
    }
    txt(row.k, x + 48, ry + 6, 22, 'normal', C.muted, 'left')
    txt(row.v, x + w - 48, ry + 6, 22, 'bold', row.hot ? C.navy : C.ink, 'right')
    if (row.hot) {
      circ(x + w - 48 - tw(row.v, 22, 'bold') - 18, ry - 2, 5)
      ctx.fillStyle = C.warn
      ctx.fill()
    }
  })
  const band = clamp(gy - y, 60, h - 60)
  const sg = ctx.createLinearGradient(x, band - 34, x, band + 34)
  sg.addColorStop(0, 'rgba(0,163,161,0)')
  sg.addColorStop(0.5, 'rgba(0,163,161,.16)')
  sg.addColorStop(1, 'rgba(0,163,161,0)')
  ctx.fillStyle = sg
  ctx.fillRect(x + 10, band - 34, w - 20, 68)
  ctx.restore()
}

function facePath(fw: number, chin: number): void {
  if (!ctx) return
  ctx.beginPath()
  ctx.moveTo(-fw, -16)
  ctx.bezierCurveTo(-fw, -54, -36, -69, 0, -69)
  ctx.bezierCurveTo(36, -69, fw, -54, fw, -16)
  ctx.bezierCurveTo(fw, 20, fw * 0.56, chin, 0, chin)
  ctx.bezierCurveTo(-fw * 0.56, chin, -fw, 20, -fw, -16)
  ctx.closePath()
}

interface Pt {
  x: number
  y: number
}

function drawArmChain(sh: Pt, el: Pt, ha: Pt, sleeve: string, handMode: string): void {
  if (!ctx) return
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = sleeve
  ctx.lineWidth = 38
  ctx.beginPath()
  ctx.moveTo(sh.x, sh.y)
  ctx.quadraticCurveTo((sh.x + el.x) * 0.5 - 8, (sh.y + el.y) * 0.5, el.x, el.y)
  ctx.stroke()
  const cx = el.x + (ha.x - el.x) * 0.18
  const cy = el.y + (ha.y - el.y) * 0.18
  const cx2 = el.x + (ha.x - el.x) * 0.28
  const cy2 = el.y + (ha.y - el.y) * 0.28
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 30
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx2, cy2)
  ctx.stroke()
  ctx.strokeStyle = C.skin
  ctx.lineWidth = 26
  ctx.beginPath()
  ctx.moveTo(cx2, cy2)
  ctx.quadraticCurveTo((el.x + ha.x) * 0.5, (el.y + ha.y) * 0.5 + 4, ha.x, ha.y)
  ctx.stroke()
  if (handMode === 'rest') {
    const ang = Math.atan2(ha.y - el.y, ha.x - el.x) + 1.2
    drawRestHand(ha.x, ha.y, ang)
  }
}

function drawOfficer(f: number): void {
  if (!ctx) return
  const a = I(f, T.fade[0] + 8, T.fade[1] + 12, 0, 1, easeOut)
  const rise = I(f, T.fade[0] + 8, T.fade[1] + 12, 26, 0, easeBack)
  const br = Math.sin(f / 26) * 3
  const bob = handBob(f)
  let blink = 0
  T.blinks.forEach((b) => {
    const t = f - b
    if (t >= 0 && t < 7) blink = Math.max(blink, Math.sin((t / 7) * Math.PI))
  })
  ctx.save()
  ctx.globalAlpha = a
  ctx.translate(PER.x, PER.y + rise + br)
  shadowEllipse(0, 40, 160, 26, a * 0.9)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const shL = { x: ARM_L.shoulder.x, y: ARM_L.shoulder.y + br * 0.2 }
  const elL = { x: ARM_L.elbow.x + bob.x * 0.35, y: ARM_L.elbow.y + bob.y * 0.35 }
  const haL = { x: ARM_L.hand.x + bob.x, y: ARM_L.hand.y + bob.y }
  drawArmChain(shL, elL, haL, C.navy2, 'none')
  const tg = ctx.createLinearGradient(-100, -180, 100, 40)
  tg.addColorStop(0, '#24507a')
  tg.addColorStop(0.45, C.navy2)
  tg.addColorStop(1, C.navy)
  ctx.fillStyle = tg
  ctx.beginPath()
  ctx.moveTo(-90, -166)
  ctx.bezierCurveTo(-104, -90, -100, 10, -72, 150)
  ctx.quadraticCurveTo(0, 164, 72, 150)
  ctx.bezierCurveTo(100, 10, 104, -90, 90, -166)
  ctx.bezierCurveTo(40, -188, -40, -188, -90, -166)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.08)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-70, -150)
  ctx.quadraticCurveTo(0, -172, 70, -150)
  ctx.stroke()
  const bs = I(f, T.badge[0], T.badge[1], 0, 1, easeBack)
  ctx.save()
  ctx.translate(0, -28)
  ctx.scale(0.85 + bs * 0.15, 0.85 + bs * 0.15)
  rr(-54, -18, 108, 36, 10)
  ctx.fillStyle = C.teal
  ctx.fill()
  ctx.shadowColor = 'rgba(0,163,161,.35)'
  ctx.shadowBlur = 16
  rr(-54, -18, 108, 36, 10)
  ctx.fill()
  ctx.shadowBlur = 0
  txt('EUROCLEAR', 0, 6, 16, 'bold', '#fff', 'center', '0.08em')
  ctx.restore()
  ctx.fillStyle = '#f7fafc'
  ctx.beginPath()
  ctx.moveTo(-34, -170)
  ctx.lineTo(-4, -108)
  ctx.lineTo(-14, -176)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(34, -170)
  ctx.lineTo(4, -108)
  ctx.lineTo(14, -176)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = C.navy
  ctx.beginPath()
  ctx.moveTo(0, -116)
  ctx.lineTo(-12, -100)
  ctx.lineTo(0, -86)
  ctx.lineTo(12, -100)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-10, -90)
  ctx.lineTo(10, -90)
  ctx.lineTo(7, -10)
  ctx.lineTo(0, 4)
  ctx.lineTo(-7, -10)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.14)'
  ctx.beginPath()
  ctx.moveTo(-10, -90)
  ctx.lineTo(-2, -90)
  ctx.lineTo(-2, -8)
  ctx.lineTo(-6, -12)
  ctx.closePath()
  ctx.fill()
  rr(-20, -214, 40, 46, 14)
  ctx.fillStyle = C.skin
  ctx.fill()
  drawArmChain(
    { x: 94, y: -158 + br * 0.2 },
    { x: 118, y: -20 },
    { x: 102, y: 118 },
    C.navy2,
    'rest',
  )
  ctx.save()
  ctx.translate(0, -268)
  ctx.rotate(Math.sin(f / 34) * 0.012)
  const fw = 58
  const chin = 64
  circ(-fw + 6, 8, 12)
  ctx.fillStyle = C.skin
  ctx.fill()
  circ(fw - 6, 8, 12)
  ctx.fill()
  const fg = ctx.createLinearGradient(-fw, -60, fw * 0.5, chin)
  fg.addColorStop(0, '#fae0c9')
  fg.addColorStop(1, C.skin)
  facePath(fw, chin)
  ctx.fillStyle = fg
  ctx.fill()
  ctx.save()
  facePath(fw, chin)
  ctx.clip()
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#c28f66'
  ctx.beginPath()
  ctx.ellipse(0, -46, fw * 0.9, 15, 0, 0, 7)
  ctx.fill()
  ctx.globalAlpha = 0.12
  ctx.beginPath()
  ctx.ellipse(fw * 0.7, 6, 18, 40, 0, 0, 7)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#2b241f'
  ctx.beginPath()
  ctx.moveTo(-62, -2)
  ctx.bezierCurveTo(-68, -50, -40, -80, 0, -80)
  ctx.bezierCurveTo(40, -80, 68, -50, 62, -2)
  ctx.lineTo(52, -2)
  ctx.bezierCurveTo(54, -34, 40, -52, 12, -50)
  ctx.bezierCurveTo(-14, -48, -42, -54, -50, -20)
  ctx.lineTo(-52, -2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#403630'
  ctx.beginPath()
  ctx.moveTo(-28, -64)
  ctx.quadraticCurveTo(8, -76, 42, -56)
  ctx.quadraticCurveTo(6, -64, -22, -52)
  ctx.closePath()
  ctx.fill()
  const look = -4.2
  ctx.strokeStyle = '#2b241f'
  ctx.lineWidth = 5.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-34, -18)
  ctx.quadraticCurveTo(-20, -26, -6, -18)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(6, -18)
  ctx.quadraticCurveTo(20, -26, 34, -18)
  ctx.stroke()
  const open = 1 - blink
  ;[-20, 20].forEach((ex) => {
    if (!ctx) return
    if (open > 0.06) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(ex + look, -2, 12, 10 * open, 0, 0, 7)
      ctx.fill()
      const ig = ctx.createRadialGradient(ex + look, -3, 1, ex + look + 1, -2, 6)
      ig.addColorStop(0, '#5a4636')
      ig.addColorStop(1, '#2b2320')
      ctx.fillStyle = ig
      ctx.beginPath()
      ctx.ellipse(ex + look + 1, -2, 5.8, 5.8 * Math.min(open * 1.2, 1), 0, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#fff'
      circ(ex + look + 3, -4.5, 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#2b241f'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(ex - 12, -2 - 10 * open)
    ctx.quadraticCurveTo(ex, -12 - 2 * open, ex + 12, -2 - 10 * open)
    ctx.stroke()
  })
  ctx.strokeStyle = C.skinSh
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(-1, 10)
  ctx.quadraticCurveTo(6, 18, -2, 22)
  ctx.stroke()
  ctx.strokeStyle = '#96524b'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-14, 40)
  ctx.quadraticCurveTo(0, 48, 14, 40)
  ctx.stroke()
  ctx.restore()
  txt('Ispettore Euroclear', 0, 200, 24, 'bold', C.mid, 'center')
  txt('Verifica del conto personale', 0, 232, 18, 'normal', C.faint, 'center')
  ctx.restore()
}

function drawFloatingChips(f: number): void {
  if (!ctx) return
  const chips = [
    { at: 55, x: 980, y: 220, label: 'Prelievi multipli', ok: false },
    { at: 120, x: 1040, y: 300, label: 'Pattern anomalo', ok: false },
    { at: 200, x: 990, y: 380, label: 'Risk scoring', ok: true },
    { at: 280, x: 1060, y: 460, label: 'Euroclear review', ok: true },
  ]
  chips.forEach((c, i) => {
    if (!ctx || f < c.at) return
    const t = I(f, c.at, c.at + 16, 0, 1, easeBack)
    const bob = Math.sin(f / 20 + i) * 4
    ctx.save()
    ctx.globalAlpha = clamp(t, 0, 1)
    ctx.translate(c.x, c.y + bob + (1 - t) * 20)
    const pad = 18
    const wd = tw(c.label, 20, 'bold') + pad * 2 + 28
    rr(0, -22, wd, 44, 22)
    ctx.fillStyle = c.ok ? C.okSoft : C.warnSoft
    ctx.fill()
    ctx.strokeStyle = c.ok ? 'rgba(18,183,106,.4)' : 'rgba(245,158,11,.45)'
    ctx.lineWidth = 1.8
    rr(0, -22, wd, 44, 22)
    ctx.stroke()
    circ(20, 0, 7)
    ctx.fillStyle = c.ok ? C.ok : C.warn
    ctx.fill()
    txt(c.label, 36, 7, 20, 'bold', c.ok ? '#0b7d4e' : C.warnInk, 'left')
    ctx.restore()
  })
}

function drawStatusBar(f: number): void {
  if (!ctx) return
  const a = I(f, 20, 40, 0, 1, easeOut)
  const y = 980
  ctx.save()
  ctx.globalAlpha = a
  rr(160, y - 36, W - 320, 72, 20)
  ctx.fillStyle = 'rgba(255,255,255,.92)'
  ctx.fill()
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  rr(160, y - 36, W - 320, 72, 20)
  ctx.stroke()
  circ(210, y, 14)
  ctx.fillStyle = C.teal
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.35 + Math.sin(f / 10) * 0.25
  circ(210, y, 22)
  ctx.strokeStyle = C.teal
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
  const msgs = [
    'Controllo del conto personale avviato da Euroclear',
    'Motivo: frequenti tentativi di prelievo fondi',
    'Ispezione dell’area riservata in corso',
    'Euroclear valuta i rischi della transazione',
  ]
  const msg = msgs[Math.floor(f / 70) % msgs.length] ?? msgs[0] ?? ''
  txt(msg, 250, y + 8, 26, 'bold', C.ink, 'left')
  ctx.restore()
}

export function drawEuroclearSceneFrame(frame: number, data: EuroclearSceneData): void {
  if (!ctx) return
  try {
    const f = Math.max(0, Math.min(TOTAL, frame))
    ctx.clearRect(0, 0, W, H)
    drawBG()
    drawLogo(f)
    const rise = I(f, T.fade[0] + 8, T.fade[1] + 12, 26, 0, easeBack)
    const br = Math.sin(f / 26) * 3
    const personY = PER.y + rise + br
    const bob = handBob(f)
    const scan = scanPos(f)
    const handW = { x: PER.x + ARM_L.hand.x + bob.x, y: personY + ARM_L.hand.y + bob.y }
    drawAccountCard(f, scan.x, scan.y, data)
    drawFloatingChips(f)
    drawOfficer(f)
    const fadeA = I(f, T.fade[0] + 8, T.fade[1] + 12, 0, 1, easeOut)
    ctx.save()
    ctx.globalAlpha = fadeA
    drawHeldMagnifier(handW.x, handW.y, f)
    ctx.restore()
    drawStatusBar(f)
  } catch (err) {
    console.warn(err)
    ctx.fillStyle = '#eef5fb'
    ctx.fillRect(0, 0, W, H)
  }
}
