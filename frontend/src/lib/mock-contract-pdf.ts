/**
 * Минимальный валидный PDF (одна страница) — data URL для «Apri PDF» до бэка.
 * Не претендует на юридический договор.
 */

const PDF_BYTES = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 14 Tf 40 100 Td (Velora - Contratto di credito) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000384 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
459
%%EOF
`

let cachedUrl: string | null = null

/** Blob URL; один на вкладку. revoke при unload не обязателен для демо. */
export function getMockContractPdfUrl(): string {
  if (cachedUrl !== null) return cachedUrl
  const blob = new Blob([PDF_BYTES], { type: 'application/pdf' })
  cachedUrl = URL.createObjectURL(blob)
  return cachedUrl
}
