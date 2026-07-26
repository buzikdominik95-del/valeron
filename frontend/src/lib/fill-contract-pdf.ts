import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Заполнение Calipso-2.0.pdf: аккуратное имя в поле «Cliente / Contraente»
 * (как policy-pdf.php: 60×67 mm) + опционально подпись.
 * Без «мусорного» списка полей поверх бланка.
 */

const MM = 72 / 25.4

export interface ContractPdfFields {
  fullName: string
  email?: string
  amount?: string
  monthly?: string
  duration?: string
  iban?: string
  contractNumber?: string
  signedAt?: string
  signatureDataUrl?: string
}

function toPdfText(value: string): string {
  const map: Record<string, string> = {
    '€': 'EUR',
    '—': '-',
    '–': '-',
    '’': "'",
    '‘': "'",
    '“': '"',
    '”': '"',
  }
  let s = value
  for (const [from, to] of Object.entries(map)) s = s.split(from).join(to)
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .trim()
}

function mmX(mm: number): number {
  return mm * MM
}

function mmYFromTop(pageHeight: number, mmFromTop: number, fontSize: number): number {
  return pageHeight - mmFromTop * MM - fontSize * 0.72
}

async function embedPngFromDataUrl(
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

async function embedImageUrl(
  pdf: PDFDocument,
  url: string,
): Promise<Awaited<ReturnType<PDFDocument['embedPng']>> | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (url.endsWith('.webp') || url.includes('webp')) {
      /* pdf-lib does not embed webp — skip */
      return null
    }
    return await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

export async function fillContractPdf(
  templateUrl: string,
  fields: ContractPdfFields,
  assets?: { stampUrl?: string; lenderSigUrl?: string },
): Promise<Uint8Array> {
  const res = await fetch(templateUrl)
  if (!res.ok) throw new Error(`PDF template HTTP ${res.status}`)
  const template = await res.arrayBuffer()

  const pdf = await PDFDocument.load(template)
  const page = pdf.getPages()[0]
  if (!page) throw new Error('PDF has no pages')

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const { height } = page.getSize()
  /* тёмно-синие «чернила» — ближе к бланку, не pure black */
  const ink = rgb(0.08, 0.12, 0.22)

  const name = toPdfText(fields.fullName)
  if (name !== '') {
    /* policy-pdf.php: Helvetica 13 @ (60mm, 67mm) — только имя в поле Cliente */
    const size = 12.5
    page.drawText(name, {
      x: mmX(58),
      y: mmYFromTop(height, 66.5, size),
      size,
      font,
      color: ink,
      maxWidth: mmX(110),
    })
  }

  /* Prestatore: печать + подпись компании (нижняя зона бланка) */
  if (assets?.stampUrl) {
    const stamp = await embedImageUrl(pdf, assets.stampUrl)
    if (stamp) {
      const w = mmX(32)
      const h = (stamp.height / stamp.width) * w
      page.drawImage(stamp, {
        x: mmX(118),
        y: mmYFromTop(height, 268, 0) - h,
        width: w,
        height: h,
        opacity: 0.9,
      })
    }
  }
  if (assets?.lenderSigUrl) {
    const sig = await embedImageUrl(pdf, assets.lenderSigUrl)
    if (sig) {
      const w = mmX(42)
      const h = (sig.height / sig.width) * w
      page.drawImage(sig, {
        x: mmX(128),
        y: mmYFromTop(height, 275, 0) - h,
        width: w,
        height: h,
        opacity: 0.92,
      })
    }
  }

  /* Prenditore signature */
  if (fields.signatureDataUrl) {
    const png = await embedPngFromDataUrl(pdf, fields.signatureDataUrl)
    if (png) {
      const sigW = mmX(48)
      const sigH = Math.min((png.height / png.width) * sigW, mmX(18))
      page.drawImage(png, {
        x: mmX(22),
        y: mmYFromTop(height, 275, 0) - sigH,
        width: sigW,
        height: sigH,
        opacity: 0.95,
      })
    }
  }

  return pdf.save()
}

export async function fillContractPdfObjectUrl(
  templateUrl: string,
  fields: ContractPdfFields,
  assets?: { stampUrl?: string; lenderSigUrl?: string },
): Promise<string> {
  const bytes = await fillContractPdf(templateUrl, fields, assets)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return URL.createObjectURL(new Blob([copy], { type: 'application/pdf' }))
}
