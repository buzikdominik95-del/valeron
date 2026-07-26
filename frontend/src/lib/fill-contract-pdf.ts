import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Заполнение шаблона Calipso-2.0.pdf данными клиента — как policy-pdf.php
 * на старом проде (FPDI + SetXY(60, 67) + Helvetica 13).
 *
 * Координаты: FPDF (мм, сверху-слева) → pdf-lib (pt, снизу-слева).
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
  /** dataURL PNG подписи заёмщика */
  signatureDataUrl?: string
}

/** Helvetica/WinAnsi: убираем символы вне Latin-1. */
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

/** Y в мм от верхнего края страницы → pdf-lib baseline. */
function mmYFromTop(pageHeight: number, mmFromTop: number, fontSize: number): number {
  return pageHeight - mmFromTop * MM - fontSize * 0.75
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

/**
 * @returns PDF bytes with user fields drawn on the template
 */
export async function fillContractPdf(
  templateUrl: string,
  fields: ContractPdfFields,
): Promise<Uint8Array> {
  const res = await fetch(templateUrl)
  if (!res.ok) throw new Error(`PDF template HTTP ${res.status}`)
  const template = await res.arrayBuffer()

  const pdf = await PDFDocument.load(template)
  const page = pdf.getPages()[0]
  if (!page) throw new Error('PDF has no pages')

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()
  const black = rgb(0, 0, 0)

  const name = toPdfText(fields.fullName)
  if (name !== '') {
    /* policy-pdf.php: SetFont Helvetica 13, SetXY(60, 67) */
    const size = 13
    page.drawText(name, {
      x: mmX(60),
      y: mmYFromTop(height, 67, size),
      size,
      font,
      color: black,
    })
  }

  /*
   * Доп. поля под основным именем (старый generateContractPdf кладёт таблицу;
   * на шаблоне Calipso-2.0 есть блок реквизитов — дублируем ключевые строки
   * компактной колонкой справа-внизу, не перекрывая печать/подписи).
   */
  const extra: Array<[string, string]> = []
  if (fields.contractNumber) extra.push(['N. Contratto', fields.contractNumber])
  if (fields.email) extra.push(['Email', fields.email])
  if (fields.amount) extra.push(['Importo', fields.amount])
  if (fields.monthly) extra.push(['Rata', fields.monthly])
  if (fields.duration) extra.push(['Durata', fields.duration])
  if (fields.iban) extra.push(['IBAN', fields.iban])
  if (fields.signedAt) extra.push(['Firmato', fields.signedAt])

  let rowY = mmYFromTop(height, 78, 9)
  for (const [label, value] of extra) {
    const text = toPdfText(`${label}: ${value}`)
    if (text === '') continue
    page.drawText(text, {
      x: mmX(60),
      y: rowY,
      size: 9,
      font: bold,
      color: black,
      maxWidth: mmX(120),
    })
    rowY -= 11
  }

  /* Подпись клиента — как Image() в generateContractPdf (слева, нижняя зона). */
  if (fields.signatureDataUrl) {
    const png = await embedPngFromDataUrl(pdf, fields.signatureDataUrl)
    if (png) {
      const sigW = mmX(55)
      const sigH = (png.height / png.width) * sigW
      page.drawImage(png, {
        x: mmX(20),
        y: mmYFromTop(height, 250, 0) - sigH,
        width: sigW,
        height: sigH,
      })
    }
  }

  return pdf.save()
}

/** Blob URL для iframe; вызывающий обязан revokeObjectURL. */
export async function fillContractPdfObjectUrl(
  templateUrl: string,
  fields: ContractPdfFields,
): Promise<string> {
  const bytes = await fillContractPdf(templateUrl, fields)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}
