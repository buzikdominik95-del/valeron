/**
 * Реалистичный «рукописный» росчерк из ФИО (canvas PNG).
 * Не просто italic-текст: наклон, вариация толщины, лёгкая волна baseline.
 */

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeTypedSignatureDataUrl(
  name: string,
  width = 560,
  height = 160,
): string | null {
  const text = name.trim().replace(/\s+/g, ' ')
  if (text === '') return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)

  const rnd = mulberry32(hashSeed(text))
  const ink = `rgb(${28 + Math.floor(rnd() * 18)}, ${42 + Math.floor(rnd() * 20)}, ${88 + Math.floor(rnd() * 40)})`

  /* Слегка наклонённая «полоса» подписи */
  ctx.save()
  ctx.translate(width * 0.04, height * 0.62)
  ctx.rotate((-8 + rnd() * 4) * (Math.PI / 180))

  const families = [
    '"Segoe Script"',
    '"Brush Script MT"',
    '"Lucida Handwriting"',
    'cursive',
  ]
  const family = families.join(', ')

  let fontSize = Math.min(56, height * 0.52)
  const maxW = width * 0.88
  for (;;) {
    ctx.font = `italic ${fontSize}px ${family}`
    if (ctx.measureText(text).width <= maxW || fontSize <= 22) break
    fontSize -= 1
  }

  /* Основной росчерк */
  ctx.fillStyle = ink
  ctx.globalAlpha = 0.92
  ctx.fillText(text, 0, 0)

  /* Лёгкая «вторая линия» чернил — глубина */
  ctx.globalAlpha = 0.18
  ctx.fillText(text, 0.6, 0.8)

  /* Подчёркивающая росчерк-линия под именем */
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = ink
  ctx.lineWidth = 1.4 + rnd() * 0.8
  ctx.lineCap = 'round'
  const tw = Math.min(ctx.measureText(text).width, maxW)
  ctx.beginPath()
  const yLine = fontSize * 0.28
  ctx.moveTo(2, yLine)
  const steps = 12
  for (let i = 1; i <= steps; i += 1) {
    const x = (tw * i) / steps
    const y = yLine + Math.sin(i * 0.9 + rnd()) * (1.2 + rnd())
    ctx.lineTo(x, y)
  }
  /* хвостик вправо */
  ctx.quadraticCurveTo(tw + 18 + rnd() * 10, yLine - 4, tw + 28 + rnd() * 14, yLine + 6 + rnd() * 4)
  ctx.stroke()

  ctx.restore()

  return canvas.toDataURL('image/png')
}
