/**
 * PNG dataURL «рукописной» подписи из ФИО — для автоподстановки в договор,
 * когда человек не рисовал на планшете.
 */
export function makeTypedSignatureDataUrl(name: string, width = 480, height = 140): string | null {
  const text = name.trim()
  if (text === '') return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0f1b2d'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  let fontSize = Math.min(52, height * 0.48)
  const maxWidth = width * 0.9
  for (;;) {
    ctx.font = `italic ${fontSize}px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`
    if (ctx.measureText(text).width <= maxWidth || fontSize <= 18) break
    fontSize -= 2
  }

  ctx.fillText(text, width * 0.06, height * 0.58, maxWidth)
  return canvas.toDataURL('image/png')
}
