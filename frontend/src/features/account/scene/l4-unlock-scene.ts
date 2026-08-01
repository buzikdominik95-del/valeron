/**
 * L4 intro canvas: «sblocco fondi» (ported from stage4-withdrawal.html).
 * Loops until unmounted. No bottom progress bar. Amount = user credit (not 1 € test).
 */

export interface L4UnlockLabels {
  /** Header: «Sblocco dei fondi» */
  stageTitle: string
  /** Main line under header */
  headline: string
  chipUnlocked: string
  chipCredit: string
  cardCaption: string
  receiptTitle: string
  receiptNo: string
  receiptAmount: string
  receiptPaid: string
  receiptBrand: string
  receiptOk: string
  receiptWait: string
  vaultLocked: string
  vaultOpen: string
  vaultCta: string
  creditChip: string
  personRole: string
  step1: string
  step2: string
  step3: string
  statusWait: string
  statusSent: string
  statusBank: string
  statusPaid: string
  statusUnlock: string
  statusReady: string
  trust1: string
  trust2: string
  trust3: string
  trust4: string
}

export interface L4UnlockOptions {
  amountEuros: number
  personName: string
  /** last 4 of IBAN / card */
  accountTail: string
  look: 'bob' | 'crop'
  labels: L4UnlockLabels
}

const W = 1920
const H = 1080
const FPS = 30
const TOTAL = 320
const LOOP = TOTAL + 46

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeBack = (t: number) => {
  const c = 1.70158 + 1
  return 1 + c * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
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

function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const F = 'Inter, "Segoe UI", system-ui, sans-serif'

const C = {
  brand: '#1b39c4',
  brand2: '#3f6bff',
  deep: '#122a8f',
  ink: '#101f47',
  mid: '#2b3765',
  muted: '#8a95bd',
  faint: '#aeb7d6',
  line: '#e6ebf8',
  ok: '#12b76a',
  okSoft: '#e9f9f0',
  okLine: '#bfe9d3',
  skin: '#f4d3b6',
  skinSh: '#e5bb98',
  gold1: '#fff6c8',
  gold2: '#fbd763',
  gold3: '#eeb63a',
  gold4: '#cd8f1d',
}

const T = {
  fade: [0, 16] as const,
  card: [8, 32] as const,
  rcp: [30, 54] as const,
  coin: [44, 104] as const,
  fill: [58, 122] as const,
  bar: [106, 130] as const,
  paid: [134, 154] as const,
  unlock: [166, 198] as const,
  count: [198, 244] as const,
  btn: [238, 258] as const,
  arms: [206, 238] as const,
  smile: [204, 230] as const,
  badge: [212, 232] as const,
  credit: [214, 292] as const,
  st1: 46,
  st2: 136,
  st3: 200,
  blinks: [60, 150, 264],
}

const HIT = T.paid[0]
const CARD = { x: 282, y: 452 }
const RCP = { x: 794, y: 498 }
const VLT = { x: 1186, y: 452 }
const PER = { x: 1584, y: 702 }
const PAID = { x: 44, y: 112 }

type PersonStyle = {
  style: 'bob' | 'crop'
  hair: string
  hairHi: string
  browC: string
  eyeC: string
  shirt: string
  shirtDk: string
  jaw: number
  chin: number
  sh: number
  brow: number
  browW: number
  lash: number
  stub: number
  tie: number
  lip: string
}

const PEOPLE: Record<'bob' | 'crop', PersonStyle> = {
  bob: {
    style: 'bob',
    hair: '#e3b465',
    hairHi: '#f6dda0',
    browC: '#c0954f',
    eyeC: '#7d6445',
    shirt: '#3f5bd0',
    shirtDk: '#2b41a0',
    jaw: 0.95,
    chin: 60,
    sh: 78,
    brow: 4.2,
    browW: 11,
    lash: 1,
    stub: 0,
    tie: 0,
    lip: '#a8514c',
  },
  crop: {
    style: 'crop',
    hair: '#2b241f',
    hairHi: '#403630',
    browC: '#2b241f',
    eyeC: '#2b241f',
    shirt: '#2e5fc0',
    shirtDk: '#1f4499',
    jaw: 1.07,
    chin: 63,
    sh: 91,
    brow: 6.0,
    browW: 13,
    lash: 0,
    stub: 0.15,
    tie: 1,
    lip: '#96524b',
  },
}

function rr(
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

function circ(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

function txt(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  weight: string,
  color: string,
  align: CanvasTextAlign = 'left',
  ls?: string,
): void {
  ctx.save()
  ctx.font = `${weight} ${size}px ${F}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if (ls) ctx.letterSpacing = ls
  ctx.fillText(s, x, y)
  ctx.restore()
}

function tw(ctx: CanvasRenderingContext2D, s: string, size: number, weight: string): number {
  ctx.save()
  ctx.font = `${weight} ${size}px ${F}`
  const w = ctx.measureText(s).width
  ctx.restore()
  return w
}

function fmtAmount(n: number, locale = 'it-IT'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtCount(n: number): string {
  const [intPart = '0', frac = '00'] = n.toFixed(2).split('.')
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + frac
}

function qb(
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

function gCheck(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 6.5 * k, y + 0.6 * k)
  ctx.lineTo(x - 2 * k, y + 5.2 * k)
  ctx.lineTo(x + 6.8 * k, y - 4.6 * k)
  ctx.stroke()
}

function gClock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.arc(x, y, 8.9 * k, 0, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - 4.8 * k)
  ctx.lineTo(x, y)
  ctx.lineTo(x + 3.4 * k, y + 2.2 * k)
  ctx.stroke()
}

function gCard(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.roundRect(x - 9.4 * k, y - 6.4 * k, 18.8 * k, 12.8 * k, 2.6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 9.4 * k, y - 2 * k)
  ctx.lineTo(x + 9.4 * k, y - 2 * k)
  ctx.stroke()
}

/** Mini icona banca (sotto caption slot sinistro). */
function gBank(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 9 * k, y + 2 * k)
  ctx.lineTo(x, y - 7 * k)
  ctx.lineTo(x + 9 * k, y + 2 * k)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.rect(x - 7.5 * k, y + 2 * k, 15 * k, 6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 4 * k, y + 2 * k)
  ctx.lineTo(x - 4 * k, y + 8 * k)
  ctx.moveTo(x, y + 2 * k)
  ctx.lineTo(x, y + 8 * k)
  ctx.moveTo(x + 4 * k, y + 2 * k)
  ctx.lineTo(x + 4 * k, y + 8 * k)
  ctx.stroke()
}

function gLock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.roundRect(x - 7.4 * k, y - 1.6 * k, 14.8 * k, 10.6 * k, 2.6 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - 1.9 * k, 3.7 * k, Math.PI, 0)
  ctx.stroke()
}

function gShield(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x, y - 9.1 * k)
  ctx.lineTo(x + 8 * k, y - 6.3 * k)
  ctx.lineTo(x + 8 * k, y - 0.2 * k)
  ctx.bezierCurveTo(x + 8 * k, y + 4.8 * k, x + 4.4 * k, y + 8.1 * k, x, y + 9.2 * k)
  ctx.bezierCurveTo(x - 4.4 * k, y + 8.1 * k, x - 8 * k, y + 4.8 * k, x - 8 * k, y - 0.2 * k)
  ctx.lineTo(x - 8 * k, y - 6.3 * k)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 3.3 * k, y + 0.2 * k)
  ctx.lineTo(x - 0.8 * k, y + 2.7 * k)
  ctx.lineTo(x + 3.5 * k, y - 2.1 * k)
  ctx.stroke()
}

function gBolt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x + 1.6 * k, y - 9.4 * k)
  ctx.lineTo(x - 6.7 * k, y + 1.5 * k)
  ctx.lineTo(x - 1.5 * k, y + 1.5 * k)
  ctx.lineTo(x - 2.5 * k, y + 9.4 * k)
  ctx.lineTo(x + 5.7 * k, y - 1.4 * k)
  ctx.lineTo(x + 0.5 * k, y - 1.4 * k)
  ctx.closePath()
  ctx.fill()
}

function gReceipt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x - 5.8 * k, y - 9 * k)
  ctx.lineTo(x + 5.8 * k, y - 9 * k)
  ctx.lineTo(x + 5.8 * k, y + 9 * k)
  ctx.lineTo(x + 2.9 * k, y + 7.2 * k)
  ctx.lineTo(x, y + 9 * k)
  ctx.lineTo(x - 2.9 * k, y + 7.2 * k)
  ctx.lineTo(x - 5.8 * k, y + 9 * k)
  ctx.closePath()
  ctx.stroke()
}

function gUserMini(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.arc(x, y - 3.4 * k, 3.9 * k, 0, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 7.2 * k, y + 8 * k)
  ctx.bezierCurveTo(x - 7.2 * k, y + 1.8 * k, x + 7.2 * k, y + 1.8 * k, x + 7.2 * k, y + 8 * k)
  ctx.stroke()
}

function gArrowDown(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 24
  ctx.beginPath()
  ctx.moveTo(x, y - 8 * k)
  ctx.lineTo(x, y + 5 * k)
  ctx.moveTo(x - 5 * k, y)
  ctx.lineTo(x, y + 5 * k)
  ctx.lineTo(x + 5 * k, y)
  ctx.stroke()
}

function shadowEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  a: number,
): void {
  ctx.save()
  ctx.globalAlpha = a
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx)
  g.addColorStop(0, 'rgba(27,57,196,.28)')
  g.addColorStop(1, 'rgba(27,57,196,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

function drawBG(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.55, '#f4f7fd')
  g.addColorStop(1, '#e9eefa')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const r = ctx.createRadialGradient(W * 0.5, -140, 60, W * 0.5, -140, 900)
  r.addColorStop(0, 'rgba(63,107,255,.13)')
  r.addColorStop(1, 'rgba(63,107,255,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.fillStyle = 'rgba(27,57,196,.045)'
  for (let x = 120; x < W - 80; x += 44) {
    for (let y = 300; y < 780; y += 44) {
      ctx.beginPath()
      ctx.arc(x, y, 1.4, 0, 7)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  phase: number,
  alpha = 1,
): void {
  const sx = Math.cos(phase)
  const w = Math.abs(sx) * r
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(170,120,20,.45)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 7
  if (w < r * 0.2) {
    const eg = ctx.createLinearGradient(x, y - r, x, y + r)
    eg.addColorStop(0, '#f0c458')
    eg.addColorStop(1, '#b9801a')
    ctx.fillStyle = eg
    rr(ctx, x - r * 0.13, y - r, r * 0.26, r * 2, r * 0.13)
    ctx.fill()
  } else {
    const g = ctx.createRadialGradient(x - w * 0.35, y - r * 0.35, 2, x, y, r)
    g.addColorStop(0, C.gold1)
    g.addColorStop(0.34, C.gold2)
    g.addColorStop(0.66, C.gold3)
    g.addColorStop(1, C.gold4)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, w, r, 0, 0, 7)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'rgba(255,246,200,.9)'
    ctx.lineWidth = r * 0.11
    ctx.beginPath()
    ctx.ellipse(x, y, w * 0.82, r * 0.82, 0, 0, 7)
    ctx.stroke()
    if (w > r * 0.42) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(Math.abs(sx), 1)
      ctx.font = `bold ${r * 1.1}px ${F}`
      ctx.fillStyle = '#8a5a10'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('€', 0, 1)
      ctx.restore()
    }
  }
  ctx.restore()
}

function drawHairBob(ctx: CanvasRenderingContext2D, p: PersonStyle): void {
  ctx.fillStyle = p.hair
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
  ctx.fillStyle = p.hairHi
  ctx.beginPath()
  ctx.moveTo(-42, -30)
  ctx.quadraticCurveTo(-16, -62, 26, -52)
  ctx.quadraticCurveTo(-4, -50, -34, -22)
  ctx.closePath()
  ctx.fill()
}

function drawHairCrop(ctx: CanvasRenderingContext2D, p: PersonStyle): void {
  ctx.fillStyle = p.hair
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
  ctx.fillStyle = p.hairHi
  ctx.beginPath()
  ctx.moveTo(-30, -62)
  ctx.quadraticCurveTo(6, -74, 40, -56)
  ctx.quadraticCurveTo(4, -62, -24, -52)
  ctx.closePath()
  ctx.fill()
}

function facePath(ctx: CanvasRenderingContext2D, fw: number, chin: number): void {
  ctx.beginPath()
  ctx.moveTo(-fw, -16)
  ctx.bezierCurveTo(-fw, -54, -36, -69, 0, -69)
  ctx.bezierCurveTo(36, -69, fw, -54, fw, -16)
  ctx.bezierCurveTo(fw, 20, fw * 0.56, chin, 0, chin)
  ctx.bezierCurveTo(-fw * 0.56, chin, -fw, 20, -fw, -16)
  ctx.closePath()
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sd: number,
  open: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(sd * (1 - open) * 0.45)
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#b8825c'
  ctx.beginPath()
  ctx.ellipse(0, 4, 16, 17, 0, 0, 7)
  ctx.fill()
  ctx.restore()
  const pg = ctx.createRadialGradient(-5, -7, 2, 0, 0, 21)
  pg.addColorStop(0, '#fae0c9')
  pg.addColorStop(1, C.skin)
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.ellipse(0, 0, 17, 19, 0, 0, 7)
  ctx.fill()
  ctx.restore()
}

function drawPerson(ctx: CanvasRenderingContext2D, f: number, look: 'bob' | 'crop'): void {
  const p = PEOPLE[look]
  const app = I(f, T.fade[0] + 10, T.fade[1] + 14, 0, 1, easeOut)
  const rise = I(f, T.fade[0] + 10, T.fade[1] + 14, 30, 0, easeBack)
  const br = Math.sin(f / 26) * 3
  const arm = I(f, T.arms[0], T.arms[1], 0, 1, easeBack)
  let blink = 0
  for (const b of T.blinks) {
    const t = f - b
    if (t >= 0 && t < 7) blink = Math.max(blink, Math.sin((t / 7) * Math.PI))
  }

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(PER.x, PER.y + rise)
  shadowEllipse(ctx, 0, 26, 150, 24, app)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const s0 = p.sh

  ctx.save()
  ctx.translate(0, br * 0.5)
  const tg = ctx.createLinearGradient(-s0, -180, s0, -10)
  tg.addColorStop(0, '#4d67d8')
  tg.addColorStop(0.45, p.shirt)
  tg.addColorStop(1, p.shirtDk)
  ctx.fillStyle = tg
  ctx.beginPath()
  ctx.moveTo(-s0, -166)
  ctx.bezierCurveTo(-s0 - 16, -152, -s0 - 24, -90, -s0 - 26, -20)
  ctx.quadraticCurveTo(0, -4, s0 + 26, -20)
  ctx.bezierCurveTo(s0 + 24, -90, s0 + 16, -152, s0, -166)
  ctx.bezierCurveTo(s0 * 0.6, -186, -s0 * 0.6, -186, -s0, -166)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = C.skin
  rr(ctx, -21, -214, 42, 50, 15)
  ctx.fill()
  ctx.fillStyle = p.shirt
  ctx.beginPath()
  ctx.moveTo(-s0, -166)
  ctx.quadraticCurveTo(0, -188, s0, -166)
  ctx.quadraticCurveTo(0, -148, -s0, -166)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
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
  if (p.tie) {
    ctx.fillStyle = '#16307f'
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
  }
  ctx.restore()

  for (const sd of [-1, 1] as const) {
    const shx = sd * s0 * 0.98
    const shy = -160 + br * 0.4
    const ex = sd * I(f, T.arms[0], T.arms[1], s0 + 26, s0 + 40, easeBack)
    const ey = I(f, T.arms[0], T.arms[1], -78, -188, easeBack) + br * 0.4
    const hx = sd * I(f, T.arms[0], T.arms[1], s0 + 34, s0 + 16, easeBack)
    const hy = I(f, T.arms[0], T.arms[1], 12, -304, easeBack) + br * 0.6
    ctx.strokeStyle = p.shirt
    ctx.lineWidth = 38
    ctx.beginPath()
    ctx.moveTo(shx, shy)
    ctx.quadraticCurveTo(sd * Math.abs(ex) * 1.03, (shy + ey) / 2, ex, ey)
    ctx.stroke()
    ctx.strokeStyle = C.skin
    ctx.lineWidth = 28
    ctx.beginPath()
    ctx.moveTo(ex + (hx - ex) * 0.24, ey + (hy - ey) * 0.24)
    ctx.quadraticCurveTo((ex + hx) / 2, (ey + hy) / 2, hx, hy)
    ctx.stroke()
    drawHand(ctx, hx, hy, sd, arm)
  }

  ctx.save()
  ctx.translate(0, -268 + br)
  ctx.rotate(Math.sin(f / 34) * 0.01)
  const fw = 56 * p.jaw
  ctx.fillStyle = C.skin
  circ(ctx, -fw + 4, 6, 12)
  ctx.fill()
  circ(ctx, fw - 4, 6, 12)
  ctx.fill()
  const fg = ctx.createLinearGradient(-fw, -60, fw * 0.6, p.chin)
  fg.addColorStop(0, '#fae0c9')
  fg.addColorStop(1, C.skin)
  facePath(ctx, fw, p.chin)
  ctx.fillStyle = fg
  ctx.fill()
  if (p.style === 'bob') drawHairBob(ctx, p)
  else drawHairCrop(ctx, p)

  const open = 1 - blink
  for (const ex of [-22, 22]) {
    if (open > 0.06) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(ex, -3, 11.4, 9.8 * open, 0, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#2b2320'
      ctx.beginPath()
      ctx.ellipse(ex + 1, -3, 5.6, 5.6 * Math.min(open * 1.2, 1), 0, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex + 3.2, -5.6, 2, 0, 7)
      ctx.fill()
    }
  }
  const mC = I(f, T.smile[0], T.smile[1], 4, 22, easeOut)
  const mW = I(f, T.smile[0], T.smile[1], 13, 21, easeOut)
  const my = p.chin * 0.58
  ctx.strokeStyle = p.lip
  ctx.lineWidth = 4.4
  ctx.beginPath()
  ctx.moveTo(-mW, my)
  ctx.quadraticCurveTo(0, my + mC, mW, my)
  ctx.stroke()
  ctx.restore()

  const bs = I(f, T.badge[0], T.badge[1], 0, 1, easeBack)
  if (bs > 0.01) {
    ctx.save()
    ctx.translate(74, -336)
    ctx.scale(bs, bs)
    ctx.shadowColor = 'rgba(18,183,106,.5)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 6
    ctx.fillStyle = C.ok
    circ(ctx, 0, 0, 29)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 5
    circ(ctx, 0, 0, 29)
    ctx.stroke()
    ctx.lineWidth = 5.4
    gCheck(ctx, 0, 0, 42)
    ctx.restore()
  }
  ctx.restore()
}

/**
 * Banca partner (ex carta VELORA) — edificio stile transfer-scene, slot sinistro.
 */
function drawCard(
  ctx: CanvasRenderingContext2D,
  f: number,
  amountLabel: string,
  accountTail: string,
  caption: string,
): void {
  const app = I(f, T.card[0], T.card[1], 0, 1, easeOut)
  if (app <= 0.001) return
  const sc = I(f, T.card[0], T.card[1], 0.82, 1, easeBack)
  const fl = Math.sin(f / 34) * 4
  let kick = 0
  const kt = f - T.coin[0]
  if (kt >= 0 && kt < 16) kick = Math.sin((kt / 16) * Math.PI) * 0.02

  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(CARD.x, CARD.y + fl + 18)
  ctx.rotate(-kick)
  ctx.scale(sc, sc)

  /* Ombra sotto la base */
  ctx.save()
  ctx.shadowColor = 'rgba(20,40,150,.28)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 16
  ctx.fillStyle = 'rgba(18,42,143,.12)'
  ctx.beginPath()
  ctx.ellipse(0, 92, 168, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  /* Gradini */
  ctx.fillStyle = '#8ea4f5'
  rr(ctx, -168, 72, 336, 18, 6)
  ctx.fill()
  ctx.fillStyle = '#6f8aef'
  rr(ctx, -152, 56, 304, 18, 6)
  ctx.fill()
  ctx.fillStyle = '#5574e6'
  rr(ctx, -136, 40, 272, 18, 6)
  ctx.fill()

  /* Stylobate */
  ctx.fillStyle = C.brand
  rr(ctx, -128, 26, 256, 14, 4)
  ctx.fill()

  /* Muro */
  ctx.fillStyle = '#e8edfb'
  rr(ctx, -116, -98, 232, 124, 6)
  ctx.fill()
  ctx.strokeStyle = C.brand
  ctx.lineWidth = 2.4
  rr(ctx, -116, -98, 232, 124, 6)
  ctx.stroke()

  /* Porta */
  ctx.fillStyle = C.deep
  ctx.beginPath()
  ctx.moveTo(-22, 26)
  ctx.lineTo(-22, -36)
  ctx.arc(0, -36, 22, Math.PI, 0)
  ctx.lineTo(22, 26)
  ctx.closePath()
  ctx.fill()

  /* Finestre */
  ctx.fillStyle = '#c5d2f8'
  ctx.strokeStyle = C.deep
  ctx.lineWidth = 2
  for (const wx of [-88, 60] as const) {
    rr(ctx, wx, -78, 28, 40, 4)
    ctx.fill()
    rr(ctx, wx, -78, 28, 40, 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(wx + 14, -78)
    ctx.lineTo(wx + 14, -38)
    ctx.moveTo(wx, -58)
    ctx.lineTo(wx + 28, -58)
    ctx.stroke()
  }

  /* Colonne */
  for (let i = 0; i < 5; i++) {
    const x = -96 + i * 48
    ctx.fillStyle = '#dce4fb'
    ctx.strokeStyle = C.brand
    ctx.lineWidth = 2
    rr(ctx, x - 9, -92, 18, 108, 3)
    ctx.fill()
    rr(ctx, x - 9, -92, 18, 108, 3)
    ctx.stroke()
    ctx.fillStyle = C.brand
    rr(ctx, x - 13, -100, 26, 10, 2)
    ctx.fill()
    rr(ctx, x - 12, 10, 24, 10, 2)
    ctx.fill()
  }

  /* Architrave + BANCA */
  ctx.fillStyle = C.brand
  rr(ctx, -144, -126, 288, 26, 5)
  ctx.fill()
  txt(ctx, 'BANCA', 0, -108, 16, 'bold', 'rgba(255,255,255,.9)', 'center', '0.28em')

  /* Frontone */
  ctx.beginPath()
  ctx.moveTo(-152, -126)
  ctx.lineTo(0, -198)
  ctx.lineTo(152, -126)
  ctx.closePath()
  ctx.fillStyle = '#c8d4f7'
  ctx.fill()
  ctx.strokeStyle = C.brand
  ctx.lineWidth = 2.8
  ctx.stroke()
  ctx.strokeStyle = C.brand
  ctx.lineWidth = 2.4
  circ(ctx, 0, -158, 14)
  ctx.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 18, -158 + Math.sin(a) * 18)
    ctx.lineTo(Math.cos(a) * 23, -158 + Math.sin(a) * 23)
    ctx.stroke()
  }

  /* Bandiera */
  ctx.strokeStyle = C.brand
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, -198)
  ctx.lineTo(0, -238)
  ctx.stroke()
  const wave = Math.sin(f / 9) * 3.5
  ctx.fillStyle = C.brand2
  ctx.beginPath()
  ctx.moveTo(0, -236)
  ctx.quadraticCurveTo(20, -230 + wave, 38, -224)
  ctx.quadraticCurveTo(20, -218 + wave, 0, -214)
  ctx.closePath()
  ctx.fill()

  /* Importo sotto la base (ex on-card amount) */
  txt(ctx, amountLabel, 0, 118, 22, 'bold', C.ink, 'center')

  ctx.restore()

  const tail = accountTail.slice(-4) || '••••'
  ctx.save()
  ctx.globalAlpha = app
  txt(ctx, caption, CARD.x, 660, 24, 'bold', C.mid, 'center')
  const s2 = `IBAN •• ${tail}`
  const wd = tw(ctx, s2, 20, 'normal')
  ctx.strokeStyle = C.faint
  ctx.lineWidth = 2
  gBank(ctx, CARD.x - wd / 2 - 16, 684, 21)
  txt(ctx, s2, CARD.x - wd / 2 + 6, 691, 20, 'normal', C.faint, 'left')
  ctx.restore()
}

function drawCoinFlight(
  ctx: CanvasRenderingContext2D,
  f: number,
  amountLabel: string,
): void {
  const t = (f - T.coin[0]) / (T.coin[1] - T.coin[0])
  if (t < 0 || t > 1) return
  /* Moneta parte dalla facciata banca (ex angolo carta) */
  const a = { x: CARD.x + 40, y: CARD.y - 20 }
  const b = { x: RCP.x - 30, y: RCP.y - 92 }
  const ctrl = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 230 }
  const e = easeIO(t)
  const p = qb(a, ctrl, b, e)
  for (let k = 1; k <= 13; k++) {
    const pp = qb(a, ctrl, b, clamp(e - k * 0.017, 0, 1))
    ctx.save()
    ctx.globalAlpha = (1 - k / 13) * 0.32
    ctx.fillStyle = 'rgba(243,199,80,1)'
    ctx.beginPath()
    ctx.arc(pp.x, pp.y, 13 * (1 - k / 14), 0, 7)
    ctx.fill()
    ctx.restore()
  }
  const fade = t < 0.08 ? t / 0.08 : t > 0.93 ? (1 - t) / 0.07 : 1
  drawCoin(ctx, p.x, p.y, 30, (f - T.coin[0]) * 0.28, clamp(fade, 0, 1))
  if (t > 0.12 && t < 0.9) {
    const pt = qb(a, ctrl, b, clamp(e - 0.07, 0, 1))
    ctx.save()
    ctx.globalAlpha = 0.9
    const s = amountLabel
    const wd = tw(ctx, s, 17, 'bold') + 24
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#f0d9a0'
    ctx.lineWidth = 2
    rr(ctx, pt.x - wd / 2, pt.y - 52, wd, 30, 15)
    ctx.fill()
    rr(ctx, pt.x - wd / 2, pt.y - 52, wd, 30, 15)
    ctx.stroke()
    txt(ctx, s, pt.x, pt.y - 31, 17, 'bold', '#8a5a10', 'center')
    ctx.restore()
  }
}

function drawReceipt(
  ctx: CanvasRenderingContext2D,
  f: number,
  opts: L4UnlockOptions,
  amountLabel: string,
): void {
  const L = opts.labels
  const app = I(f, T.rcp[0], T.rcp[1], 0, 1, easeOut)
  if (app <= 0.001) return
  const sc = I(f, T.rcp[0], T.rcp[1], 0.84, 1, easeBack)
  const fill = I(f, T.fill[0], T.fill[1], 0, 1)
  let shake = 0
  const ht = f - HIT
  if (ht >= 0 && ht < 20) shake = Math.sin(ht * 0.9) * 0.015 * (1 - ht / 20)
  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(RCP.x, RCP.y)
  ctx.rotate(shake)
  ctx.scale(sc, sc)

  ctx.save()
  ctx.shadowColor = 'rgba(27,57,196,.24)'
  ctx.shadowBlur = 42
  ctx.shadowOffsetY = 20
  ctx.beginPath()
  ctx.moveTo(-150, -206)
  ctx.lineTo(150, -206)
  ctx.lineTo(150, 176)
  for (let i = 0; i < 12; i++) {
    const x = 150 - i * 25
    ctx.lineTo(x - 12.5, 196)
    ctx.lineTo(x - 25, 176)
  }
  ctx.lineTo(-150, 176)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = C.brand
  circ(ctx, -122, -170, 15)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3.2
  ctx.beginPath()
  ctx.moveTo(-128, -176)
  ctx.lineTo(-122, -164)
  ctx.lineTo(-116, -176)
  ctx.stroke()
  txt(ctx, L.receiptTitle, -100, -174, 15, 'bold', C.ink, 'left', '0.06em')
  txt(ctx, L.receiptNo, -100, -155, 11, 'normal', C.faint, 'left')

  ctx.strokeStyle = '#eceff9'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-126, -132)
  ctx.lineTo(126, -132)
  ctx.stroke()

  const fieldLabels = ['Tipo', 'Da', 'A', 'Data'] as const
  for (let i = 0; i < 4; i++) {
    const p = clamp(fill * 4 - i, 0, 1)
    if (p <= 0) continue
    const y = -110 + i * 26
    const fl = fieldLabels[i] ?? '·'
    txt(ctx, fl, -126, y + 8, 12, 'normal', C.faint, 'left')
    ctx.fillStyle = '#c8d0e8'
    rr(ctx, 126 - (96 + rnd(i) * 34) * p, y, (96 + rnd(i) * 34) * p, 9, 4.5)
    ctx.fill()
  }

  const ap = clamp((fill - 0.82) / 0.18, 0, 1)
  if (ap > 0) {
    ctx.save()
    ctx.globalAlpha = ap
    txt(ctx, L.receiptAmount, -126, 42, 13, 'bold', C.faint, 'left', '0.12em')
    txt(ctx, amountLabel, 126, 46, 26, 'bold', C.ink, 'right')
    ctx.restore()
  }

  const bp = I(f, T.bar[0], T.bar[1], 0, 1)
  for (let i = 0; i < 30; i++) {
    if (i / 30 > bp) break
    const w = 1.8 + rnd(i * 5) * 4.4
    ctx.fillStyle = C.ink
    ctx.fillRect(-124 + i * 8.4, 132, w, 34)
  }

  const ip = I(f, T.paid[0], T.paid[1], 0, 1, easeBack)
  if (ip > 0.01) {
    ctx.save()
    ctx.translate(PAID.x, PAID.y)
    ctx.rotate(-0.24)
    const s = 1.4 - 0.4 * Math.min(ip, 1)
    ctx.scale(s, s)
    ctx.globalAlpha = Math.min(ip, 1) * 0.94
    ctx.strokeStyle = C.ok
    ctx.lineWidth = 5
    circ(ctx, 0, 0, 62)
    ctx.stroke()
    ctx.lineWidth = 2.4
    circ(ctx, 0, 0, 53)
    ctx.stroke()
    txt(ctx, L.receiptPaid, 0, -1, 16, 'bold', C.ok, 'center')
    txt(ctx, L.receiptBrand, 0, 20, 9.5, 'bold', C.ok, 'center', '0.12em')
    ctx.restore()
  }
  ctx.restore()

  const ix = RCP.x + PAID.x
  const iy = RCP.y + PAID.y
  const rt = (f - HIT) / 32
  if (rt >= 0 && rt < 1) {
    ctx.save()
    ctx.globalAlpha = (1 - rt) * 0.65
    ctx.strokeStyle = 'rgba(18,183,106,1)'
    ctx.lineWidth = 5
    circ(ctx, ix, iy, 62 + easeOut(rt) * 108)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = app
  txt(ctx, opts.labels.headline, RCP.x, 752, 22, 'bold', C.mid, 'center')
  const s2 = f >= T.paid[1] ? L.receiptOk : L.receiptWait
  const wd = tw(ctx, s2, 20, 'normal')
  ctx.strokeStyle = f >= T.paid[1] ? C.ok : C.faint
  ctx.lineWidth = 2
  if (f >= T.paid[1]) gCheck(ctx, RCP.x - wd / 2 - 15, 776, 21)
  else gClock(ctx, RCP.x - wd / 2 - 15, 776, 21)
  txt(ctx, s2, RCP.x - wd / 2 + 4, 783, 20, 'normal', f >= T.paid[1] ? '#0b7d4e' : C.faint, 'left')
  ctx.restore()
}

function drawVault(
  ctx: CanvasRenderingContext2D,
  f: number,
  amountEuros: number,
  L: L4UnlockLabels,
): void {
  const app = I(f, T.fade[0] + 12, T.fade[1] + 18, 0, 1, easeOut)
  if (app <= 0.001) return
  const u = I(f, T.unlock[0], T.unlock[1], 0, 1, easeOut)
  const sc = I(f, T.fade[0] + 12, T.fade[1] + 18, 0.86, 1, easeBack)
  let jolt = 0
  const jt = f - T.unlock[0]
  if (jt >= 0 && jt < 18) jolt = Math.sin(jt * 0.8) * 3 * (1 - jt / 18)
  ctx.save()
  ctx.globalAlpha = app
  ctx.translate(VLT.x, VLT.y + jolt)
  ctx.scale(sc, sc)

  ctx.save()
  ctx.shadowColor = u > 0.5 ? 'rgba(18,183,106,.24)' : 'rgba(27,57,196,.14)'
  ctx.shadowBlur = 32
  ctx.shadowOffsetY = 14
  ctx.fillStyle = u > 0.5 ? '#f4fcf8' : '#fbfcff'
  rr(ctx, -155, -132, 310, 272, 20)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = u > 0.5 ? C.okLine : C.line
  ctx.lineWidth = 2.4
  rr(ctx, -155, -132, 310, 272, 20)
  ctx.stroke()

  ctx.save()
  ctx.translate(0, -52)
  const col = u > 0.5 ? C.ok : '#aeb7d6'
  ctx.strokeStyle = col
  ctx.lineWidth = 11
  ctx.lineCap = 'round'
  ctx.save()
  ctx.translate(23, -6)
  ctx.rotate(u * 0.85)
  ctx.translate(-23, 6 - u * 7)
  ctx.beginPath()
  ctx.arc(0, -8, 23, Math.PI, 0)
  ctx.moveTo(-23, -8)
  ctx.lineTo(-23, -2)
  ctx.moveTo(23, -8)
  ctx.lineTo(23, -2)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = col
  rr(ctx, -38, -2, 76, 58, 13)
  ctx.fill()
  ctx.fillStyle = u > 0.5 ? '#eafaf1' : '#f7f9ff'
  circ(ctx, 0, 22, 8)
  ctx.fill()
  ctx.fillRect(-3, 22, 6, 14)
  ctx.restore()

  txt(
    ctx,
    u > 0.5 ? L.vaultOpen : L.vaultLocked,
    0,
    22,
    13,
    'bold',
    u > 0.5 ? '#0b7d4e' : C.faint,
    'center',
    '0.12em',
  )
  const amt = I(f, T.count[0], T.count[1], 0, amountEuros, easeOut)
  txt(
    ctx,
    f >= T.count[0] ? `${fmtCount(amt)} €` : '—— €',
    0,
    66,
    32,
    'bold',
    u > 0.5 ? C.ink : C.faint,
    'center',
  )

  const bp = I(f, T.btn[0], T.btn[1], 0, 1, easeBack)
  if (bp > 0.01) {
    ctx.save()
    ctx.globalAlpha = Math.min(bp, 1)
    const s = Math.min(bp, 1)
    ctx.translate(0, 108)
    ctx.scale(s, s)
    ctx.shadowColor = 'rgba(18,183,106,.5)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 8
    ctx.fillStyle = C.ok
    rr(ctx, -104, -23, 208, 46, 23)
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = Math.min(bp, 1)
    ctx.translate(0, 108)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.6
    gArrowDown(ctx, -46, 0, 22)
    txt(ctx, L.vaultCta, 14, 8, 21, 'bold', '#fff', 'center')
    ctx.restore()
  }
  ctx.restore()
}

function drawCredit(ctx: CanvasRenderingContext2D, f: number, label: string): void {
  if (f < T.credit[0] || f > T.credit[1]) return
  const t = (f - T.credit[0]) / (T.credit[1] - T.credit[0])
  const y = PER.y - 336 - easeOut(clamp(t * 2.2, 0, 1)) * 70
  const al = t < 0.1 ? t / 0.1 : t > 0.74 ? clamp((1 - t) / 0.26, 0, 1) : 1
  ctx.save()
  ctx.globalAlpha = al
  const wd = tw(ctx, label, 32, 'bold') + 56
  ctx.shadowColor = 'rgba(18,183,106,.35)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = C.okSoft
  rr(ctx, PER.x - wd / 2, y - 36, wd, 58, 29)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = C.okLine
  ctx.lineWidth = 2.4
  rr(ctx, PER.x - wd / 2, y - 36, wd, 58, 29)
  ctx.stroke()
  txt(ctx, label, PER.x, y + 3, 32, 'bold', '#0b7d4e', 'center')
  ctx.restore()
}

function chip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  green: boolean,
  drawGlyph: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void,
): number {
  const pad = 22
  const h = 48
  const wd = tw(ctx, label, 21, 'bold') + pad * 2 + 30
  ctx.save()
  ctx.fillStyle = green ? C.okSoft : '#fbfcff'
  rr(ctx, x - wd, y - h / 2, wd, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = green ? C.okLine : C.line
  ctx.lineWidth = 2
  rr(ctx, x - wd, y - h / 2, wd, h, h / 2)
  ctx.stroke()
  ctx.strokeStyle = green ? C.ok : C.brand2
  ctx.fillStyle = green ? C.ok : C.brand2
  ctx.lineWidth = 2.4
  drawGlyph(ctx, x - wd + pad + 9, y, 24)
  txt(ctx, label, x - wd + pad + 28, y + 7, 21, 'bold', green ? '#0b7d4e' : '#5b678f')
  ctx.restore()
  return wd
}

function statusText(f: number, L: L4UnlockLabels): [string, string] {
  if (f < T.coin[0]) return [L.statusWait, C.brand]
  if (f < T.coin[1]) return [L.statusSent, C.brand]
  if (f < T.paid[0]) return [L.statusBank, C.brand]
  if (f < T.unlock[0]) return [L.statusPaid, C.ok]
  if (f < T.unlock[1]) return [L.statusUnlock, C.brand]
  return [L.statusReady, C.ok]
}

function drawUI(
  ctx: CanvasRenderingContext2D,
  f: number,
  opts: L4UnlockOptions,
  amountLabel: string,
): void {
  const L = opts.labels
  const app = I(f, 0, 14, 0, 1, easeOut)
  ctx.save()
  ctx.globalAlpha = app
  /* Stage title: sblocco fondi — not «stage 4 / withdraw» */
  txt(ctx, L.stageTitle, 112, 120, 20, 'bold', C.faint, 'left', '0.16em')
  txt(ctx, L.headline, 112, 192, 48, 'bold', C.ink)
  let rx = 1808
  const w1 = chip(ctx, rx, 128, L.chipUnlocked, true, gCheck)
  rx -= w1 + 14
  chip(ctx, rx, 128, L.chipCredit.replace('{amount}', amountLabel), false, gBolt)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = app
  txt(ctx, opts.personName, PER.x, 830, 26, 'bold', C.mid, 'center')
  const s2 = L.personRole
  const wd = tw(ctx, s2, 21, 'normal')
  ctx.strokeStyle = C.faint
  ctx.lineWidth = 2
  gUserMini(ctx, PER.x - wd / 2 - 16, 855, 22)
  txt(ctx, s2, PER.x - wd / 2 + 4, 862, 21, 'normal', C.faint, 'left')
  ctx.restore()

  /* Three steps — no bottom 0–100% progress bar */
  const steps: {
    label: string
    glyph: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void
    at: number
    anchor: number
  }[] = [
    { label: L.step1, glyph: gCard, at: T.st1, anchor: 112 },
    { label: L.step2, glyph: gCheck, at: T.st2, anchor: 960 },
    { label: L.step3, glyph: gLock, at: T.st3, anchor: 1808 },
  ]
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    const active = f >= step.at
    const lw = tw(ctx, step.label, 23, 'bold')
    const tot = 44 + 22 + lw
    const x0 =
      i === 0 ? step.anchor : i === 1 ? step.anchor - tot / 2 : step.anchor - tot
    const y = 940
    const pop = active ? I(f, step.at, step.at + 12, 0, 1, easeBack) : 0
    ctx.save()
    ctx.fillStyle = active ? C.okSoft : '#fbfcff'
    circ(ctx, x0 + 22, y, 22)
    ctx.fill()
    ctx.strokeStyle = active ? C.okLine : C.line
    ctx.lineWidth = 2.2
    circ(ctx, x0 + 22, y, 22)
    ctx.stroke()
    if (active) {
      ctx.save()
      ctx.globalAlpha = (1 - pop) * 0.6
      ctx.strokeStyle = C.ok
      ctx.lineWidth = 3
      circ(ctx, x0 + 22, y, 22 + pop * 16)
      ctx.stroke()
      ctx.restore()
    }
    ctx.strokeStyle = active ? C.ok : C.faint
    ctx.lineWidth = 2.4
    step.glyph(ctx, x0 + 22, y, 24)
    txt(ctx, step.label, x0 + 66, y + 8, 23, 'bold', active ? C.mid : C.faint)
    ctx.restore()
  }

  /* Status line only (no progress track 0–100%) */
  const [st, sc2] = statusText(f, L)
  ctx.save()
  ctx.globalAlpha = app
  ctx.strokeStyle = C.faint
  ctx.lineWidth = 2
  gClock(ctx, 123, 1002, 22)
  txt(ctx, st, 142, 1010, 22, 'bold', sc2)
  ctx.restore()

  const items: {
    label: string
    glyph: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void
  }[] = [
    { label: L.trust1, glyph: gShield },
    { label: L.trust2, glyph: gBolt },
    { label: L.trust3, glyph: gLock },
    { label: L.trust4, glyph: gReceipt },
  ]
  let total = 0
  const ws = items.map((it) => tw(ctx, it.label, 20, 'normal') + 26 + 34)
  for (const w of ws) total += w
  let x = (W - total) / 2
  const y = 1050
  ctx.save()
  ctx.globalAlpha = app * 0.95
  items.forEach((it, i) => {
    ctx.strokeStyle = '#b3bcda'
    ctx.fillStyle = '#b3bcda'
    ctx.lineWidth = 2
    it.glyph(ctx, x + 11, y - 7, 22)
    txt(ctx, it.label, x + 30, y, 20, 'normal', '#9aa4c8')
    x += ws[i] ?? 0
  })
  ctx.restore()
}

export function drawL4UnlockFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  opts: L4UnlockOptions,
): void {
  const f = Math.min(frame, TOTAL)
  const amountLabel = fmtAmount(Math.max(0, opts.amountEuros))
  ctx.clearRect(0, 0, W, H)
  drawBG(ctx)
  drawCard(ctx, f, amountLabel, opts.accountTail, opts.labels.cardCaption)
  drawReceipt(ctx, f, opts, amountLabel)
  drawCoinFlight(ctx, f, amountLabel)
  drawVault(ctx, f, Math.max(0, opts.amountEuros), opts.labels)
  drawPerson(ctx, f, opts.look)
  drawCredit(ctx, f, opts.labels.creditChip)
  drawUI(ctx, f, opts, amountLabel)
}

export const L4_UNLOCK_FPS = FPS
export const L4_UNLOCK_LOOP = LOOP
export const L4_UNLOCK_W = W
export const L4_UNLOCK_H = H
