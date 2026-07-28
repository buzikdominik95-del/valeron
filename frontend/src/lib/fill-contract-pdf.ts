import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Заполнение cpi-contract.pdf (бланк Calipso/Velora).
 *
 * Шаблон: MediaBox ≈ 210×297 — это A4 в **миллиметрах** (1 unit = 1 mm),
 * а не в PDF points. Старый policy-pdf.php/FPDI ставил SetXY(60, 67) в мм —
 * те же числа сюда, без × (72/25.4).
 *
 * Текст: WinAnsi (Times-Roman — serif бланка). Кириллицу транслитерируем
 * в латиницу — никаких «???????».
 */

/** A4 points; если страница близка к этому — координаты в pt, иначе мм. */
const A4_PT_W = 595
const PT_PER_MM = 72 / 25.4

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

/** Кириллица → латиница (как на старом проде: читаемое ФИО на бланке). */
const CYR_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Е: 'E',
  Ё: 'E',
  Ж: 'Zh',
  З: 'Z',
  И: 'I',
  Й: 'Y',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'Kh',
  Ц: 'Ts',
  Ч: 'Ch',
  Ш: 'Sh',
  Щ: 'Shch',
  Ъ: '',
  Ы: 'Y',
  Ь: '',
  Э: 'E',
  Ю: 'Yu',
  Я: 'Ya',
}

/**
 * Готовит строку для StandardFonts.TimesRoman (WinAnsi).
 * Без подстановки «?» — неподдерживаемые символы убираем/заменяем на ASCII.
 */
export function toPdfText(value: string): string {
  const map: Record<string, string> = {
    '€': 'EUR',
    '—': '-',
    '–': '-',
    '’': "'",
    '‘': "'",
    '“': '"',
    '”': '"',
    '«': '"',
    '»': '"',
    '№': 'N',
    '°': 'o',
    '×': 'x',
    '÷': '/',
    '…': '...',
  }

  let s = value.normalize('NFC')
  for (const [from, to] of Object.entries(map)) s = s.split(from).join(to)

  /* кириллица → латиница посимвольно */
  let out = ''
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(CYR_MAP, ch)) {
      out += CYR_MAP[ch]
      continue
    }
    out += ch
  }

  /* диакритика: è→e, à→a (итал. имена остаются читаемыми: Nicoletti → Nicoletti) */
  out = out.normalize('NFD').replace(/\p{M}/gu, '')

  /* только печатный ASCII — без «?»-заглушек */
  return out
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Масштаб координат: мм (шаблон 210×297) или points (A4 595×842).
 * width ≈ 210 → unit = mm; width ≈ 595 → unit = pt, mm умножаем на PT_PER_MM.
 */
function unitScale(pageWidth: number): number {
  return pageWidth >= A4_PT_W * 0.85 ? PT_PER_MM : 1
}

function xMm(mm: number, scale: number): number {
  return mm * scale
}

/** Y в PDF (снизу вверх) из мм от верхнего края. */
function yFromTop(pageHeight: number, mmFromTop: number, scale: number, fontSize = 0): number {
  return pageHeight - mmFromTop * scale - fontSize * 0.72
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
    if (url.endsWith('.webp') || url.includes('webp')) return null
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
  const res = await fetch(templateUrl, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`PDF template HTTP ${res.status}`)
  const template = await res.arrayBuffer()
  if (template.byteLength < 100) throw new Error('PDF template empty')

  /* ignoreEncryption: часть шаблонов с прода открывается только так */
  const pdf = await PDFDocument.load(template, { ignoreEncryption: true })
  const page = pdf.getPages()[0]
  if (!page) throw new Error('PDF has no pages')

  /* Times-Roman: ближе к UI (чуть толще regular, не full Bold). Cyr → latin. */
  const fontReg = await pdf.embedFont(StandardFonts.TimesRoman)
  const { width, height } = page.getSize()
  const scale = unitScale(width)
  /* Тон ink policy-template (~#1f2022). */
  const bodyInk = rgb(0.122, 0.125, 0.133)

  /*
   * policy-template.png → page 210×297 mm:
   *   name top 23.38% (+2px) → 69.44 mm; x after colon → 61.7 mm
   */
  const name = toPdfText(fields.fullName)
  if (name !== '') {
    const size = scale === 1 ? 4.56 : 12
    page.drawText(name, {
      x: xMm(61.7, scale),
      y: yFromTop(height, 69.44, scale, size),
      size,
      font: fontReg,
      color: bodyInk,
      maxWidth: xMm(110, scale),
    })
  }

  /* Prestatore: печать + подпись (правый нижний угол, фото 5 — крупная круглая) */
  if (assets?.stampUrl) {
    const stamp = await embedImageUrl(pdf, assets.stampUrl)
    if (stamp) {
      /* ~48 mm — печать целиком, без обрезки края страницы */
      const w = xMm(48, scale)
      const h = (stamp.height / stamp.width) * w
      page.drawImage(stamp, {
        x: xMm(128, scale),
        y: yFromTop(height, 242, scale, 0) - h,
        width: w,
        height: h,
        opacity: 0.96,
      })
    }
  }
  if (assets?.lenderSigUrl) {
    const sig = await embedImageUrl(pdf, assets.lenderSigUrl)
    if (sig) {
      const w = xMm(38, scale)
      const h = (sig.height / sig.width) * w
      page.drawImage(sig, {
        x: xMm(130, scale),
        y: yFromTop(height, 268, scale, 0) - h,
        width: w,
        height: h,
        opacity: 0.94,
      })
    }
  }

  /* Prenditore — росчерк слева у «Firma:» */
  if (fields.signatureDataUrl) {
    const png = await embedPngFromDataUrl(pdf, fields.signatureDataUrl)
    if (png) {
      const sigW = xMm(42, scale)
      const sigH = Math.min((png.height / png.width) * sigW, xMm(16, scale))
      page.drawImage(png, {
        x: xMm(38, scale),
        y: yFromTop(height, 268, scale, 0) - sigH,
        width: sigW,
        height: sigH,
        opacity: 0.96,
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

/**
 * Certificato CPI (Velora): policy-template.png → PDF A4 + ФИО клиента
 * в том же месте, что VelPdfDialog (left 29.4%, top 23.38%).
 * НЕ Calipso blank.
 */
export async function fillCpiCertificatePdf(
  templateImageUrl: string,
  fields: { fullName: string; signatureDataUrl?: string },
  assets?: { stampUrl?: string },
): Promise<Uint8Array> {
  const res = await fetch(templateImageUrl, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`CPI template HTTP ${res.status}`)
  const imgBytes = new Uint8Array(await res.arrayBuffer())
  if (imgBytes.byteLength < 100) throw new Error('CPI template empty')

  const pdf = await PDFDocument.create()
  /* A4 pt */
  const pageW = 595.28
  const pageH = 841.89
  const page = pdf.addPage([pageW, pageH])

  let img
  try {
    img = await pdf.embedPng(imgBytes)
  } catch {
    img = await pdf.embedJpg(imgBytes)
  }

  /* cover full page */
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
  })

  /* Times-Bold + лёгкий double-draw — ФИО на пару px «толще», как просили */
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const name = toPdfText(fields.fullName)
  if (name !== '') {
    /* VelPdfDialog: left 29.4%, top 23.38% */
    const size = 12
    const x = pageW * 0.294
    const y = pageH * (1 - 0.2338) - size * 0.75
    const color = rgb(0.122, 0.125, 0.133)
    const maxWidth = pageW * 0.52
    page.drawText(name, { x, y, size, font: fontBold, color, maxWidth })
    page.drawText(name, { x: x + 0.35, y, size, font: fontBold, color, maxWidth })
  }

  /* optional client signature bottom-left (как в диалоге) */
  if (fields.signatureDataUrl) {
    const png = await embedPngFromDataUrl(pdf, fields.signatureDataUrl)
    if (png) {
      const sigW = pageW * 0.28
      const sigH = Math.min((png.height / png.width) * sigW, pageH * 0.06)
      page.drawImage(png, {
        x: pageW * 0.14,
        y: pageH * 0.095,
        width: sigW,
        height: sigH,
        opacity: 0.92,
      })
    }
  }

  /* Velora seal — не Calipso */
  if (assets?.stampUrl) {
    const stamp = await embedImageUrl(pdf, assets.stampUrl)
    if (stamp) {
      const w = pageW * 0.22
      const h = (stamp.height / stamp.width) * w
      page.drawImage(stamp, {
        x: pageW * 0.68,
        y: pageH * 0.08,
        width: w,
        height: h,
        opacity: 0.94,
      })
    }
  }

  return pdf.save()
}

export async function fillCpiCertificatePdfObjectUrl(
  templateImageUrl: string,
  fields: { fullName: string; signatureDataUrl?: string },
  assets?: { stampUrl?: string },
): Promise<string> {
  const bytes = await fillCpiCertificatePdf(templateImageUrl, fields, assets)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return URL.createObjectURL(new Blob([copy], { type: 'application/pdf' }))
}
