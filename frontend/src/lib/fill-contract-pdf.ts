import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Заполнение cpi-contract.pdf (бланк Calipso/Velora).
 *
 * Шаблон: MediaBox ≈ 210×297 — это A4 в **миллиметрах** (1 unit = 1 mm),
 * а не в PDF points. Старый policy-pdf.php/FPDI ставил SetXY(60, 67) в мм —
 * те же числа сюда, без × (72/25.4).
 *
 * Текст: WinAnsi (Helvetica). Кириллицу транслитерируем в латиницу —
 * никаких «???????».
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
 * Готовит строку для StandardFonts.Helvetica (WinAnsi).
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
  const res = await fetch(templateUrl)
  if (!res.ok) throw new Error(`PDF template HTTP ${res.status}`)
  const template = await res.arrayBuffer()

  const pdf = await PDFDocument.load(template)
  const page = pdf.getPages()[0]
  if (!page) throw new Error('PDF has no pages')

  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const scale = unitScale(width)
  const ink = rgb(0.08, 0.12, 0.22)

  /*
   * policy-grid.png (876×1238) → page 210×297:
   *   Cliente / Contraente: ~ y_px 290 → 69.5 mm from top, name after label ~ x 62 mm
   *   Firma / stamp zone:   ~ y_px 1050–1120 → 252–269 mm
   *
   * Как policy-pdf.php: только ФИО в поле Cliente — без мусора поверх пунктов.
   */
  const name = toPdfText(fields.fullName)
  if (name !== '') {
    const size = scale === 1 ? 4.2 : 12.5
    page.drawText(name, {
      x: xMm(62, scale),
      y: yFromTop(height, 69.5, scale, size),
      size,
      font: fontBold,
      color: ink,
      maxWidth: xMm(110, scale),
    })
  }

  /* Prestatore: печать + подпись (правый нижний угол, как на проде) */
  if (assets?.stampUrl) {
    const stamp = await embedImageUrl(pdf, assets.stampUrl)
    if (stamp) {
      const w = xMm(28, scale)
      const h = (stamp.height / stamp.width) * w
      page.drawImage(stamp, {
        x: xMm(145, scale),
        y: yFromTop(height, 255, scale, 0) - h,
        width: w,
        height: h,
        opacity: 0.92,
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
