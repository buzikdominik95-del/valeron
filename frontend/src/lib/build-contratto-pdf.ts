/**
 * Полный PDF «Contratto di credito al consumo» — как лист на вкладке Documenti
 * (VelContractSheet): стороны, условия, весь piano di ammortamento, clausole, firme.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { toPdfText } from '@/lib/fill-contract-pdf'

export interface ContrattoScheduleRow {
  index: number
  date: string
  payment: string
  principal: string
  interest: string
  residual: string
}

export interface ContrattoConsumoFields {
  fullName: string
  email?: string
  amountFormatted: string
  monthlyFormatted?: string
  durationLabel?: string
  tanLabel?: string
  purpose?: string
  contractNumber?: string
  signedAt?: string
  issuedDate?: string
  place?: string
  docType?: string
  docNumber?: string
  iban?: string
  /** Полные строки графика (как в кабинете) */
  scheduleRows?: ContrattoScheduleRow[]
  scheduleTotal?: ContrattoScheduleRow
  /** Тексты clausole уже локализованные (title + paragraphs) */
  clauseBlocks?: { title?: string; lead?: string; items: string[] }[]
  signatureDataUrl?: string
  stampUrl?: string
  lenderSigUrl?: string
  brand?: string
  issuerLine?: string
  title?: string
  subtitle?: string
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 42
const CONTENT_W = PAGE_W - MARGIN * 2

const ink = rgb(0.08, 0.1, 0.16)
const muted = rgb(0.4, 0.45, 0.55)
const accent = rgb(0.11, 0.31, 0.85)
const line = rgb(0.85, 0.88, 0.93)

async function embedPngDataUrl(
  pdf: PDFDocument,
  dataUrl: string,
): Promise<Awaited<ReturnType<PDFDocument['embedPng']>> | null> {
  try {
    const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl)
    if (!m?.[1]) return null
    const bin = atob(m[1])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

async function embedPngUrl(
  pdf: PDFDocument,
  url: string,
): Promise<Awaited<ReturnType<PDFDocument['embedPng']>> | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

/** Простой word-wrap для Helvetica (approx width). */
function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const t = toPdfText(text)
  if (!t) return []
  const words = t.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(next, size) <= maxW) {
      cur = next
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

interface Ctx {
  pdf: PDFDocument
  page: PDFPage
  y: number
  font: PDFFont
  fontBold: PDFFont
}

function ensureSpace(ctx: Ctx, need: number): void {
  if (ctx.y - need >= MARGIN + 28) return
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H])
  ctx.y = PAGE_H - MARGIN
}

function drawLine(ctx: Ctx, y: number): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_W, y },
    thickness: 0.5,
    color: line,
  })
}

function para(
  ctx: Ctx,
  text: string,
  size: number,
  bold = false,
  color = ink,
  gap = 3,
): void {
  const font = bold ? ctx.fontBold : ctx.font
  const lines = wrapText(text, font, size, CONTENT_W)
  for (const ln of lines) {
    ensureSpace(ctx, size + 4)
    ctx.page.drawText(ln, { x: MARGIN, y: ctx.y, size, font, color })
    ctx.y -= size + gap
  }
}

/**
 * Полный PDF договора — содержимое вкладки Documenti / anteprima.
 */
export async function buildContrattoConsumoPdf(
  f: ContrattoConsumoFields,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const ctx: Ctx = { pdf, page, y: PAGE_H - MARGIN, font, fontBold }

  const brand = f.brand || 'Velora'
  const title = f.title || 'CONTRATTO DI CREDITO AL CONSUMO'
  const subtitle = f.subtitle || 'ai sensi del D.Lgs. 141/2010 — Credito ai Consumatori'
  const place = f.place || 'Milano'
  const issued = f.issuedDate || new Date().toLocaleDateString('it-IT')
  const num = f.contractNumber || '—'

  /* ── Header ── */
  ctx.page.drawText(toPdfText(brand), {
    x: MARGIN,
    y: ctx.y,
    size: 15,
    font: fontBold,
    color: accent,
  })
  ctx.y -= 13
  para(ctx, f.issuerLine || 'Intermediario Finanziario — Milano, Italia', 8, false, muted, 2)
  ctx.y -= 14

  para(ctx, title, 13, true, ink, 4)
  para(ctx, subtitle, 8, false, muted, 2)
  ctx.y -= 8

  para(ctx, `Fatto a ${place}, il ${issued}`, 9, false, muted, 2)
  para(ctx, `N. Contratto: ${num}`, 9, true, accent, 2)
  ctx.y -= 10

  /* ── Parties ── */
  para(ctx, 'Tra i sottoscritti', 11, true, accent, 4)
  para(
    ctx,
    `${brand} S.r.l., con sede in Milano (Italia), di seguito «il Prestatore», e la persona fisica di seguito indicata, di seguito «il Prenditore», si conviene e si stipula quanto segue.`,
    9,
    false,
    ink,
    3,
  )
  ctx.y -= 6

  const partyFields: [string, string][] = [
    ['Nome e cognome del Prenditore', f.fullName || '—'],
    ['Indirizzo email', f.email || '—'],
    ['Tipo di documento d’identità', f.docType || '—'],
    ['Numero del documento', f.docNumber || '—'],
    ['IBAN per accredito', f.iban || '—'],
  ]
  for (const [label, value] of partyFields) {
    ensureSpace(ctx, 28)
    ctx.page.drawText(toPdfText(label), {
      x: MARGIN,
      y: ctx.y,
      size: 7.5,
      font,
      color: muted,
    })
    ctx.y -= 11
    ctx.page.drawText(toPdfText(value || '—'), {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font: fontBold,
      color: ink,
    })
    ctx.y -= 3
    drawLine(ctx, ctx.y)
    ctx.y -= 12
  }

  /* ── Condizioni finanziarie ── */
  ensureSpace(ctx, 90)
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 74,
    width: CONTENT_W,
    height: 80,
    color: rgb(0.97, 0.98, 1),
    borderColor: line,
    borderWidth: 0.7,
  })
  ctx.page.drawText(toPdfText('Condizioni Finanziarie'), {
    x: MARGIN + 10,
    y: ctx.y - 14,
    size: 9,
    font: fontBold,
    color: accent,
  })
  const colW = CONTENT_W / 3
  const finY = ctx.y - 34
  ;(
    [
      ['IMPORTO EROGATO', f.amountFormatted],
      ['RATA MENSILE', f.monthlyFormatted || '—'],
      ['DURATA', f.durationLabel || '—'],
    ] as const
  ).forEach(([lab, val], i) => {
    const x = MARGIN + 10 + i * colW
    ctx.page.drawText(toPdfText(lab), { x, y: finY, size: 6.5, font, color: muted })
    ctx.page.drawText(toPdfText(val), {
      x,
      y: finY - 15,
      size: 10,
      font: fontBold,
      color: ink,
    })
  })
  ctx.page.drawText(
    toPdfText(`TAN Fisso: ${f.tanLabel || '3,8%'} — Tasso Annuo Nominale fisso per tutta la durata`),
    {
      x: MARGIN + 10,
      y: ctx.y - 66,
      size: 7.5,
      font,
      color: muted,
    },
  )
  ctx.y -= 92

  para(ctx, `Finalità del credito: ${f.purpose || '—'}`, 9, false, ink, 3)
  ctx.y -= 8

  /* ── Piano di ammortamento (полный) ── */
  const rows = f.scheduleRows ?? []
  if (rows.length > 0) {
    para(ctx, 'Piano di Ammortamento', 11, true, accent, 4)
    ensureSpace(ctx, 20)
    const headers = ['N.', 'DATA', 'RATA', 'CAPITALE', 'INTERESSI', 'RESIDUO']
    const cols = [0.07, 0.18, 0.18, 0.19, 0.19, 0.19]
    let x = MARGIN
    headers.forEach((h, i) => {
      const w = CONTENT_W * cols[i]!
      ctx.page.drawText(toPdfText(h), {
        x: x + 1,
        y: ctx.y,
        size: 6.5,
        font: fontBold,
        color: muted,
      })
      x += w
    })
    ctx.y -= 4
    drawLine(ctx, ctx.y)
    ctx.y -= 10

    const drawRow = (r: ContrattoScheduleRow, bold = false) => {
      ensureSpace(ctx, 12)
      const vals = [
        String(r.index),
        r.date,
        r.payment,
        r.principal,
        r.interest,
        r.residual,
      ]
      let cx = MARGIN
      const fnt = bold ? fontBold : font
      vals.forEach((v, i) => {
        const w = CONTENT_W * cols[i]!
        ctx.page.drawText(toPdfText(v), {
          x: cx + 1,
          y: ctx.y,
          size: 7,
          font: fnt,
          color: ink,
          maxWidth: w - 2,
        })
        cx += w
      })
      ctx.y -= 11
    }

    for (const r of rows) drawRow(r)
    if (f.scheduleTotal) {
      ensureSpace(ctx, 14)
      drawLine(ctx, ctx.y + 2)
      ctx.y -= 8
      drawRow(f.scheduleTotal, true)
    }
    ctx.y -= 10
  }

  /* ── Clausole (полный текст из ЛК) ── */
  const blocks = f.clauseBlocks ?? []
  if (blocks.length > 0) {
    para(ctx, 'Disposizioni del contratto', 11, true, accent, 5)
    for (const block of blocks) {
      if (block.title) {
        ctx.y -= 4
        para(ctx, block.title, 10, true, ink, 3)
      }
      if (block.lead) {
        para(ctx, block.lead, 9, true, muted, 3)
      }
      for (const item of block.items) {
        para(ctx, item, 8.5, false, ink, 2.5)
        ctx.y -= 2
      }
    }
    ctx.y -= 8
  }

  if (f.signedAt) {
    para(ctx, `Firmato il ${f.signedAt}`, 9, false, muted, 3)
  }

  /* ── Firme ── */
  ensureSpace(ctx, 100)
  para(ctx, 'Firme', 11, true, accent, 4)
  const boxH = 72
  const boxW = (CONTENT_W - 14) / 2
  ensureSpace(ctx, boxH + 20)
  const boxY = ctx.y - boxH

  ctx.page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: line,
    borderWidth: 0.7,
  })
  ctx.page.drawRectangle({
    x: MARGIN + boxW + 14,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: line,
    borderWidth: 0.7,
  })
  ctx.page.drawText(toPdfText('Firma del Prestatore'), {
    x: MARGIN + 6,
    y: boxY + 6,
    size: 7.5,
    font,
    color: muted,
  })
  ctx.page.drawText(toPdfText('Firma del Prenditore'), {
    x: MARGIN + boxW + 20,
    y: boxY + 6,
    size: 7.5,
    font,
    color: muted,
  })

  if (f.stampUrl) {
    const stamp = await embedPngUrl(pdf, f.stampUrl)
    if (stamp) {
      const sw = 48
      const sh = (stamp.height / stamp.width) * sw
      ctx.page.drawImage(stamp, {
        x: MARGIN + 8,
        y: boxY + 16,
        width: sw,
        height: sh,
        opacity: 0.95,
      })
    }
  }
  if (f.lenderSigUrl) {
    const ls = await embedPngUrl(pdf, f.lenderSigUrl)
    if (ls) {
      const lw = 68
      const lh = Math.min((ls.height / ls.width) * lw, 26)
      ctx.page.drawImage(ls, {
        x: MARGIN + 52,
        y: boxY + 20,
        width: lw,
        height: lh,
        opacity: 0.94,
      })
    }
  }
  if (f.signatureDataUrl) {
    const sig = await embedPngDataUrl(pdf, f.signatureDataUrl)
    if (sig) {
      const sw = 88
      const sh = Math.min((sig.height / sig.width) * sw, 34)
      ctx.page.drawImage(sig, {
        x: MARGIN + boxW + 22,
        y: boxY + 22,
        width: sw,
        height: sh,
        opacity: 0.95,
      })
    } else {
      ctx.page.drawText(toPdfText(f.fullName), {
        x: MARGIN + boxW + 22,
        y: boxY + 30,
        size: 10,
        font,
        color: ink,
      })
    }
  } else {
    ctx.page.drawText(toPdfText(f.fullName), {
      x: MARGIN + boxW + 22,
      y: boxY + 30,
      size: 10,
      font,
      color: ink,
    })
  }

  /* Footer on last page */
  ctx.page.drawText(
    toPdfText('Documento generato da Velora — area personale (Documenti). Conservare con cura.'),
    {
      x: MARGIN,
      y: 28,
      size: 7,
      font,
      color: muted,
    },
  )

  return pdf.save()
}
