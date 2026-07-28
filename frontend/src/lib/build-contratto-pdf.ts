/**
 * PDF «Contratto di credito al consumo» — как ANTEPRIMA DEL CONTRATTO в кабинете
 * (VelContractSheet), с данными клиента. Для вложения к письму contract.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { toPdfText } from '@/lib/fill-contract-pdf'

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
  docType?: string
  docNumber?: string
  iban?: string
  signatureDataUrl?: string
  stampUrl?: string
  lenderSigUrl?: string
}

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

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = rgb(0.08, 0.1, 0.16),
  maxW?: number,
): number {
  const t = toPdfText(text)
  if (!t) return y
  page.drawText(t, {
    x,
    y,
    size,
    font,
    color,
    maxWidth: maxW,
  })
  return y - size * 1.35
}

/**
 * Собирает PDF договора al consumo (1–2 страницы) с данными клиента.
 */
export async function buildContrattoConsumoPdf(
  f: ContrattoConsumoFields,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const pageW = 595.28
  const pageH = 841.89
  const margin = 48
  const contentW = pageW - margin * 2

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const page = pdf.addPage([pageW, pageH])
  let y = pageH - margin

  const ink = rgb(0.08, 0.1, 0.16)
  const muted = rgb(0.4, 0.45, 0.55)
  const accent = rgb(0.11, 0.31, 0.85)
  const line = rgb(0.85, 0.88, 0.93)

  /* Brand */
  page.drawText(toPdfText('Velora'), {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: accent,
  })
  y -= 14
  page.drawText(toPdfText('Intermediario Finanziario — Milano, Italia'), {
    x: margin,
    y,
    size: 8,
    font,
    color: muted,
  })
  y -= 28

  /* Title */
  page.drawText(toPdfText('CONTRATTO DI CREDITO AL CONSUMO'), {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: ink,
  })
  y -= 14
  page.drawText(toPdfText('ai sensi del D.Lgs. 141/2010 — Credito ai Consumatori'), {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  })
  y -= 22

  const issued = f.issuedDate || new Date().toLocaleDateString('it-IT')
  const num = f.contractNumber || '—'
  y = drawText(page, `Fatto a Milano, il ${issued}`, margin, y, 9, font, muted)
  y = drawText(page, `N. Contratto: ${num}`, margin, y, 9, fontBold, accent)
  y -= 10

  /* Parties */
  page.drawText(toPdfText('Tra i sottoscritti'), {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: accent,
  })
  y -= 16
  y = drawText(
    page,
    'Velora S.r.l., con sede in Milano (Italia), di seguito «il Prestatore», e la persona fisica di seguito indicata, di seguito «il Prenditore», si conviene e si stipula quanto segue.',
    margin,
    y,
    9,
    font,
    ink,
    contentW,
  )
  y -= 8

  const fields: [string, string][] = [
    ['Nome e cognome del Prenditore', f.fullName || '—'],
    ['Indirizzo email', f.email || '—'],
    ['Tipo di documento d’identità', f.docType || 'Carta d’identità'],
    ['Numero del documento', f.docNumber || '—'],
    ['IBAN per accredito', f.iban || '—'],
  ]
  for (const [label, value] of fields) {
    page.drawText(toPdfText(label), { x: margin, y, size: 8, font, color: muted })
    y -= 12
    page.drawText(toPdfText(value), { x: margin, y, size: 10, font: fontBold, color: ink })
    y -= 4
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentW, y },
      thickness: 0.6,
      color: line,
    })
    y -= 14
  }

  y -= 6
  /* Financial box */
  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentW,
    height: 78,
    color: rgb(0.97, 0.98, 1),
    borderColor: line,
    borderWidth: 0.8,
  })
  page.drawText(toPdfText('Condizioni Finanziarie'), {
    x: margin + 12,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: accent,
  })
  const colW = contentW / 3
  const finY = y - 36
  const finItems: [string, string][] = [
    ['IMPORTO EROGATO', f.amountFormatted],
    ['RATA MENSILE', f.monthlyFormatted || '—'],
    ['DURATA', f.durationLabel || '36 mesi'],
  ]
  finItems.forEach(([lab, val], i) => {
    const x = margin + 12 + i * colW
    page.drawText(toPdfText(lab), { x, y: finY, size: 7, font, color: muted })
    page.drawText(toPdfText(val), {
      x,
      y: finY - 16,
      size: 11,
      font: fontBold,
      color: ink,
    })
  })
  page.drawText(toPdfText(`TAN Fisso: ${f.tanLabel || '3,8%'} — Tasso Annuo Nominale fisso per tutta la durata`), {
    x: margin + 12,
    y: y - 66,
    size: 8,
    font,
    color: muted,
  })
  y -= 96

  y = drawText(
    page,
    `Finalità del credito: ${f.purpose || 'Prestito personale'}`,
    margin,
    y,
    9,
    font,
    ink,
    contentW,
  )
  y -= 8

  if (f.signedAt) {
    y = drawText(page, `Firmato il ${f.signedAt}`, margin, y, 9, font, muted)
  }

  y -= 20
  page.drawText(toPdfText('Firme'), {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: accent,
  })
  y -= 8

  /* Signature boxes */
  const boxH = 70
  const boxW = (contentW - 16) / 2
  const boxY = y - boxH

  page.drawRectangle({
    x: margin,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: line,
    borderWidth: 0.8,
  })
  page.drawRectangle({
    x: margin + boxW + 16,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: line,
    borderWidth: 0.8,
  })

  page.drawText(toPdfText('Firma del Prestatore'), {
    x: margin + 8,
    y: boxY + 8,
    size: 8,
    font,
    color: muted,
  })
  page.drawText(toPdfText('Firma del Prenditore'), {
    x: margin + boxW + 24,
    y: boxY + 8,
    size: 8,
    font,
    color: muted,
  })

  if (f.stampUrl) {
    const stamp = await embedPngUrl(pdf, f.stampUrl)
    if (stamp) {
      const sw = 52
      const sh = (stamp.height / stamp.width) * sw
      page.drawImage(stamp, {
        x: margin + 10,
        y: boxY + 18,
        width: sw,
        height: sh,
        opacity: 0.95,
      })
    }
  }
  if (f.lenderSigUrl) {
    const ls = await embedPngUrl(pdf, f.lenderSigUrl)
    if (ls) {
      const lw = 70
      const lh = Math.min((ls.height / ls.width) * lw, 28)
      page.drawImage(ls, {
        x: margin + 58,
        y: boxY + 22,
        width: lw,
        height: lh,
        opacity: 0.94,
      })
    }
  }
  if (f.signatureDataUrl) {
    const sig = await embedPngDataUrl(pdf, f.signatureDataUrl)
    if (sig) {
      const sw = 90
      const sh = Math.min((sig.height / sig.width) * sw, 36)
      page.drawImage(sig, {
        x: margin + boxW + 28,
        y: boxY + 24,
        width: sw,
        height: sh,
        opacity: 0.95,
      })
    } else {
      page.drawText(toPdfText(f.fullName), {
        x: margin + boxW + 28,
        y: boxY + 32,
        size: 11,
        font,
        color: ink,
      })
    }
  } else {
    page.drawText(toPdfText(f.fullName), {
      x: margin + boxW + 28,
      y: boxY + 32,
      size: 11,
      font,
      color: ink,
    })
  }

  /* Footer */
  page.drawText(toPdfText('Documento generato da Velora — area personale. Conservare con cura.'), {
    x: margin,
    y: 32,
    size: 7,
    font,
    color: muted,
  })

  return pdf.save()
}
