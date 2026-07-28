/**
 * Письма Velora в стиле сайта (как credit-approval blade):
 * светлый фон #eef1f8, шапка #1d4ed8, зелёный success #0e7f58.
 *
 * Вложения — только к письмам (не в чат):
 *  · contract → Contratto firmato.pdf + piano ammortamento (в теле + PDF)
 *  · policy   → Certificato CPI.pdf
 *
 * downloadClientEmail() скачивает HTML + связанные PDF из /cpi.
 */

export type ClientEmailKind = 'welcome' | 'contract' | 'policy' | 'withdrawFail'

export interface ClientEmailPayload {
  firstName: string
  lastName: string
  fullName: string
  email: string
  amountFormatted: string
  contractNumber?: string
  durationLabel?: string
  installmentFormatted?: string
  tanLabel?: string
  purpose?: string
  signedAt?: string
  cabinetUrl: string
  brand?: string
  /** Абсолютные URL вложений (PDF) — для ссылок и download */
  attachmentUrls?: { name: string; url: string }[]
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Общая оболочка = стиль сайта / credit-approval */
function shell(title: string, inner: string, brand: string): string {
  const b = esc(brand)
  const y = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — ${b}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e0f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        ${inner}
        <tr><td style="padding:16px 24px 22px;border-top:1px solid #eef2ff;background:#f8fafc;">
          <div style="font-size:12px;font-weight:700;color:#1d4ed8;">${b} S.r.l.</div>
          <div style="margin-top:4px;font-size:11px;line-height:1.5;color:#94a3b8;">
            Messaggio automatico · Non rispondere a questa email<br/>
            © ${y} ${b} — Credito preferenziale al 3,8%
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function header(brand: string, headline: string): string {
  return `<tr><td style="padding:0;background:linear-gradient(105deg,#1d4ed8 0%,#3b82f6 45%,#60a5fa 100%);">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding:22px 24px 18px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.78);font-weight:700;">
          ${esc(brand)} · Area personale
        </div>
        <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:750;color:#ffffff;letter-spacing:-0.02em;">
          ${esc(headline)}
        </div>
      </td></tr>
    </table>
  </td></tr>`
}

function amountCard(label: string, amount: string, note?: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid rgba(14,127,88,0.22);border-radius:14px;background:linear-gradient(155deg,#e6f8ee 0%,#f8fbf9 55%,#ffffff 100%);">
    <tr><td style="padding:18px 18px 16px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#0e7f58;font-weight:700;">${esc(label)}</div>
      <div style="margin-top:6px;font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-0.03em;color:#0e7f58;font-variant-numeric:tabular-nums;">${esc(amount)}</div>
      ${note ? `<div style="margin-top:8px;font-size:12px;color:#5b678f;">${esc(note)}</div>` : ''}
    </td></tr>
  </table>`
}

function cta(url: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
    <tr><td align="center" bgcolor="#1d4ed8" style="border-radius:999px;">
      <a href="${esc(url)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:750;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
        ${esc(label)}
      </a>
    </td></tr>
  </table>`
}

function attachRow(files: { name: string; url?: string }[]): string {
  if (!files.length) return ''
  const rows = files
    .map((f) => {
      const inner = f.url
        ? `<a href="${esc(f.url)}" style="color:#1d4ed8;text-decoration:none;font-weight:650;">📎 ${esc(f.name)}</a>`
        : `📎 ${esc(f.name)}`
      return `<div style="margin:0 0 8px;padding:12px 14px;border:1px solid #d8e0f0;border-radius:12px;background:#f8fafc;font-size:13px;color:#0f172a;">${inner}</div>`
    })
    .join('')
  return `<div style="margin:0 0 18px;">
    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:8px;">Allegati</div>
    ${rows}
  </div>`
}

/** Мини piano ammortamento в теле письма (таблица) */
function scheduleTable(p: ClientEmailPayload): string {
  const months = 36
  const installment = p.installmentFormatted ?? '—'
  const rows = [1, 2, 3, 12, 24, 36]
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 10px;border-top:1px solid #e2e8f0;font-size:13px;color:#334155;">${m}</td>
          <td style="padding:8px 10px;border-top:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:650;">${esc(installment)}</td>
          <td style="padding:8px 10px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">${esc(p.tanLabel ?? '3,8%')}</td>
        </tr>`,
    )
    .join('')
  return `<div style="margin:0 0 18px;">
    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:8px;">Piano di ammortamento (estratto)</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;">
      <tr style="background:#f1f5f9;">
        <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;font-weight:700;">Rata</th>
        <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;font-weight:700;">Importo</th>
        <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;font-weight:700;">TAN</th>
      </tr>
      ${rows}
    </table>
    <div style="margin-top:6px;font-size:11px;color:#94a3b8;">Durata ${esc(p.durationLabel ?? `${months} mesi`)} · dettaglio completo nel PDF allegato</div>
  </div>`
}

export function buildClientEmailHtml(kind: ClientEmailKind, p: ClientEmailPayload): string {
  const brand = p.brand ?? 'Velora'
  const name = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const files = defaultAttachments(kind, p)

  if (kind === 'welcome') {
    const body = `
      ${header(brand, 'Credito approvato')}
      <tr><td style="padding:28px 24px 10px;">
        <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#0f172a;">
          Gentile <strong>${esc(name)}</strong>,
        </p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
          abbiamo il piacere di informarla che la sua richiesta di credito è stata
          <strong style="color:#0e7f58;">approvata</strong>. Di seguito i dettagli principali.
        </p>
        ${amountCard('Importo approvato', p.amountFormatted, 'TAN fisso 3,8% · Erogazione tramite partner SEPA')}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
          <tr>
            <td style="padding:14px 16px;width:50%;vertical-align:top;">
              <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;">Nome</div>
              <div style="margin-top:4px;font-size:14px;font-weight:650;color:#0f172a;">${esc(p.firstName || '—')}</div>
            </td>
            <td style="padding:14px 16px;width:50%;vertical-align:top;border-left:1px solid #e2e8f0;">
              <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;">Cognome</div>
              <div style="margin-top:4px;font-size:14px;font-weight:650;color:#0f172a;">${esc(p.lastName || '—')}</div>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
          Acceda alla sua area personale Velora per firmare il contratto, caricare i documenti e completare l’accredito.
        </p>
        ${cta(p.cabinetUrl, 'Apri l’area personale')}
        <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#64748b;">
          Prossimi passi: verifica email · documento d’identità · fondi in 24–48 ore.
        </p>
      </td></tr>`
    return shell('Credito approvato', body, brand)
  }

  if (kind === 'contract') {
    const body = `
      ${header(brand, 'Contratto firmato')}
      <tr><td style="padding:28px 24px 10px;">
        <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#0f172a;">
          Gentile <strong>${esc(name)}</strong>,
        </p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
          il suo <strong style="color:#0e7f58;">contratto di credito</strong> è stato firmato con successo.
          In allegato trova il PDF firmato e il piano di ammortamento.
        </p>
        ${amountCard('Importo erogato', p.amountFormatted, `N. ${p.contractNumber ?? '—'} · ${p.durationLabel ?? '36 mesi'}`)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:12px;text-align:center;border-right:1px solid #e2e8f0;background:#f8fafc;">
              <div style="font-size:10px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Rata</div>
              <div style="margin-top:4px;font-weight:700;color:#1d4ed8;">${esc(p.installmentFormatted ?? '—')}</div>
            </td>
            <td style="padding:12px;text-align:center;border-right:1px solid #e2e8f0;background:#f8fafc;">
              <div style="font-size:10px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Durata</div>
              <div style="margin-top:4px;font-weight:700;color:#0f172a;">${esc(p.durationLabel ?? '36 mesi')}</div>
            </td>
            <td style="padding:12px;text-align:center;background:#f8fafc;">
              <div style="font-size:10px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">TAN</div>
              <div style="margin-top:4px;font-weight:700;color:#0e7f58;">${esc(p.tanLabel ?? '3,8%')}</div>
            </td>
          </tr>
        </table>
        ${scheduleTable(p)}
        ${attachRow(files.map((f) => ({ name: f.name, url: f.url })))}
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
          I fondi verranno accreditati entro <strong>24–48 ore</strong> dalla verifica dei documenti.
        </p>
        ${cta(p.cabinetUrl, 'Apri l’area personale')}
      </td></tr>`
    return shell('Contratto firmato', body, brand)
  }

  if (kind === 'policy') {
    const body = `
      ${header(brand, 'Certificato CPI emesso')}
      <tr><td style="padding:28px 24px 10px;">
        <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#0f172a;">
          Gentile <strong>${esc(name)}</strong>,
        </p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
          il suo <strong style="color:#0e7f58;">certificato CPI</strong> è stato emesso e firmato.
          Il documento completo è in allegato a questa email.
        </p>
        ${amountCard('Pratica', p.amountFormatted, 'Copertura assicurativa attiva · Velora CPI Registry')}
        ${attachRow(files.map((f) => ({ name: f.name, url: f.url })))}
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
          Può anche consultarlo nella sezione Documenti dell’area personale.
        </p>
        ${cta(p.cabinetUrl, 'Apri i documenti')}
      </td></tr>`
    return shell('Certificato CPI', body, brand)
  }

  /* withdrawFail */
  const body = `
    ${header(brand, 'Prelievo non completato')}
    <tr><td style="padding:28px 24px 10px;">
      <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#0f172a;">
        Gentile <strong>${esc(name)}</strong>,
      </p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
        il trasferimento di <strong>${esc(p.amountFormatted)}</strong> è stato
        <strong style="color:#dc2626;">bloccato</strong> dal Dipartimento di Monitoraggio Finanziario.
        Contatti il direttore finanziario dall’area personale per sbloccare l’account.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid rgba(220,38,38,0.25);border-radius:14px;background:linear-gradient(155deg,#fef2f2 0%,#fff 100%);">
        <tr><td style="padding:16px 18px;color:#991b1b;font-size:14px;line-height:1.5;">
          Accesso all’account limitato · contatti il direttore finanziario su Telegram per procedere.
        </td></tr>
      </table>
      ${cta(p.cabinetUrl, 'Apri l’area personale')}
    </td></tr>`
  return shell('Prelievo bloccato', body, brand)
}

export function clientEmailFilename(kind: ClientEmailKind, fullName: string): string {
  const slug =
    fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cliente'
  return `${kind}-${slug}.html`
}

/**
 * Скачивает HTML-письмо + PDF-вложения (только письма, не чат).
 */
export async function downloadClientEmail(
  kind: ClientEmailKind,
  p: ClientEmailPayload,
): Promise<void> {
  const files = defaultAttachments(kind, p)
  const html = buildClientEmailHtml(kind, { ...p, attachmentUrls: files })

  const htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' })
  triggerDownload(htmlBlob, clientEmailFilename(kind, p.fullName))

  for (const f of files) {
    try {
      const res = await fetch(f.url)
      if (!res.ok) continue
      const blob = await res.blob()
      triggerDownload(blob, f.name)
    } catch {
      /* offline / missing asset — HTML already lists the attach */
    }
  }
}

function triggerDownload(blob: Blob, name: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2_000)
}

function defaultAttachments(
  kind: ClientEmailKind,
  p: ClientEmailPayload,
): { name: string; url: string }[] {
  if (p.attachmentUrls?.length) return p.attachmentUrls
  if (typeof window === 'undefined') return []
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin).href
  const num = (p.contractNumber ?? 'CIV').replace(/[^\w-]+/g, '_')
  if (kind === 'contract') {
    const pdf = new URL('cpi/cpi-contract.pdf', base).href
    return [
      { name: `Contratto_${num}.pdf`, url: pdf },
      { name: `Piano_ammortamento_${num}.pdf`, url: pdf },
    ]
  }
  if (kind === 'policy') {
    return [
      {
        name: `Certificato_CPI_${num}.pdf`,
        url: new URL('cpi/Calipso-2.0.pdf', base).href,
      },
    ]
  }
  return []
}
