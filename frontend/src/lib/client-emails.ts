/**
 * Шаблоны клиентских писем Velora (по структуре Calipso, 66.txt §4).
 * Генерируются JS-ом per-user в отдельную папку (download / offline).
 *
 * Типы:
 *  · welcome   — приветствие после регистрации (фото 1)
 *  · contract  — договор подписан + PDF (фото 2)
 *  · policy    — страховой/CPI полис (этап 3)
 *  · withdrawFail — ошибка вывода (этап 4)
 */

export type ClientEmailKind = 'welcome' | 'contract' | 'policy' | 'withdrawFail'

export interface ClientEmailPayload {
  firstName: string
  lastName: string
  fullName: string
  email: string
  amountFormatted: string
  /** es. CIV-2026-838128 */
  contractNumber?: string
  /** es. 36 mesi */
  durationLabel?: string
  /** es. 264,92 €/mese */
  installmentFormatted?: string
  tanLabel?: string
  purpose?: string
  signedAt?: string
  cabinetUrl: string
  brand?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(inner: string, brand: string): string {
  const b = esc(brand)
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${b}</title>
</head>
<body style="margin:0;padding:0;background:#0b1c33;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#e8eef8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(160deg,#071525 0%,#0d2744 55%,#12305a 100%);padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:rgba(10,28,48,0.92);border:1px solid rgba(120,170,230,0.22);border-radius:18px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.35);">
        ${inner}
        <tr><td style="padding:16px 24px 22px;border-top:1px solid rgba(120,170,230,0.12);text-align:center;">
          <div style="font-size:11px;color:rgba(200,220,255,0.45);line-height:1.5;">
            © ${new Date().getFullYear()} ${b} · Credito digitale<br/>
            Hai ricevuto questa email perché sei registrato su ${b.toLowerCase()}.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function brandHead(brand: string, subtitle: string): string {
  return `<tr><td style="padding:22px 24px 8px;text-align:center;">
    <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.28);">
      <span style="width:8px;height:8px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px #38bdf8;"></span>
      <span style="font-size:12px;font-weight:800;letter-spacing:0.14em;color:#e0f2fe;">${esc(brand.toUpperCase())}</span>
    </div>
    <div style="margin-top:10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(186,210,240,0.55);font-weight:600;">${esc(subtitle)}</div>
  </td></tr>`
}

function cta(url: string, label: string): string {
  return `<tr><td style="padding:8px 24px 22px;text-align:center;">
    <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(180deg,#22d3ee 0%,#0ea5e9 100%);color:#042f2e;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 10px 28px rgba(14,165,233,0.35);">
      ${esc(label)} →
    </a>
  </td></tr>`
}

function amountCard(label: string, amount: string, note?: string): string {
  return `<tr><td style="padding:8px 24px 12px;">
    <div style="border:1px solid rgba(56,189,248,0.25);border-radius:16px;background:linear-gradient(160deg,rgba(14,40,70,0.9),rgba(8,24,44,0.95));padding:18px 16px;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(186,210,240,0.6);font-weight:700;">${esc(label)}</div>
      <div style="margin-top:8px;font-size:36px;font-weight:800;letter-spacing:-0.03em;color:#f0f9ff;font-variant-numeric:tabular-nums;">${esc(amount)}</div>
      ${note ? `<div style="margin-top:6px;font-size:12px;color:rgba(186,210,240,0.55);">${esc(note)}</div>` : ''}
    </div>
  </td></tr>`
}

export function buildClientEmailHtml(kind: ClientEmailKind, p: ClientEmailPayload): string {
  const brand = p.brand ?? 'Velora'
  const name = esc(p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente')
  const amount = esc(p.amountFormatted)
  const url = p.cabinetUrl

  if (kind === 'welcome') {
    const body = `
      ${brandHead(brand, 'Credito digitale')}
      <tr><td style="padding:18px 24px 4px;text-align:center;color:rgba(200,220,255,0.7);font-size:15px;">Benvenuto,</td></tr>
      <tr><td style="padding:0 24px 12px;text-align:center;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.02em;">${name} 👋</td></tr>
      ${amountCard('Importo approvato', p.amountFormatted, 'pronto per essere utilizzato')}
      <tr><td style="padding:4px 28px 12px;text-align:center;font-size:14px;line-height:1.55;color:rgba(200,220,255,0.78);">
        Il tuo credito è <span style="color:#4ade80;font-weight:700;">approvato</span> e ti aspetta nel tuo account.<br/>
        Carica i documenti e ricevi i fondi entro <strong style="color:#fff;">24–48 ore</strong>.
      </td></tr>
      ${cta(url, 'Vai al mio account')}
      <tr><td style="padding:0 24px 18px;">
        <div style="border-top:1px solid rgba(120,170,230,0.12);padding-top:14px;">
          <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(186,210,240,0.45);font-weight:700;margin-bottom:10px;">Prossimi passi</div>
          <ol style="margin:0;padding:0 0 0 1.1rem;color:rgba(210,225,245,0.8);font-size:13px;line-height:1.7;">
            <li>Verifica la tua email</li>
            <li>Carica documento d’identità</li>
            <li>Ricevi i fondi in 24–48h</li>
          </ol>
        </div>
      </td></tr>`
    return shell(body, brand)
  }

  if (kind === 'contract') {
    const body = `
      ${brandHead(brand, 'Credito digitale')}
      <tr><td style="padding:16px 24px 0;text-align:center;">
        <div style="display:inline-grid;place-items:center;width:48px;height:48px;border-radius:50%;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);color:#4ade80;font-size:22px;font-weight:800;">✓</div>
      </td></tr>
      <tr><td style="padding:12px 24px 4px;text-align:center;font-size:24px;font-weight:800;color:#fff;">Contratto firmato!</td></tr>
      <tr><td style="padding:0 28px 10px;text-align:center;font-size:14px;color:rgba(200,220,255,0.75);">
        Caro/a <strong style="color:#fff;">${name}</strong>, il tuo contratto è confermato.
      </td></tr>
      ${amountCard('Importo erogato', p.amountFormatted)}
      <tr><td style="padding:4px 24px 10px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(120,170,230,0.18);border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:12px;text-align:center;border-right:1px solid rgba(120,170,230,0.12);">
              <div style="font-size:10px;color:rgba(186,210,240,0.5);letter-spacing:0.1em;text-transform:uppercase;">Rata</div>
              <div style="margin-top:4px;font-weight:700;color:#7dd3fc;">${esc(p.installmentFormatted ?? '—')}</div>
            </td>
            <td style="padding:12px;text-align:center;border-right:1px solid rgba(120,170,230,0.12);">
              <div style="font-size:10px;color:rgba(186,210,240,0.5);letter-spacing:0.1em;text-transform:uppercase;">Durata</div>
              <div style="margin-top:4px;font-weight:700;color:#fff;">${esc(p.durationLabel ?? '—')}</div>
            </td>
            <td style="padding:12px;text-align:center;">
              <div style="font-size:10px;color:rgba(186,210,240,0.5);letter-spacing:0.1em;text-transform:uppercase;">TAEG</div>
              <div style="margin-top:4px;font-weight:700;color:#fff;">${esc(p.tanLabel ?? '3,8%')}</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:6px 28px 8px;font-size:13px;color:rgba(200,220,255,0.7);line-height:1.55;text-align:center;">
        Il PDF del contratto è allegato a questa email.<br/>
        I fondi verranno accreditati entro <strong style="color:#fff;">24–48 ore</strong> dalla verifica dei documenti.
      </td></tr>
      <tr><td style="padding:4px 24px 10px;text-align:center;">
        <span style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:1px solid rgba(120,170,230,0.22);background:rgba(14,40,70,0.6);color:#bae6fd;font-size:12px;">
          📎 Contratto_${esc(p.contractNumber ?? 'CIV')}.pdf allegato
        </span>
      </td></tr>
      ${cta(url, 'Vai al mio account')}`
    return shell(body, brand)
  }

  if (kind === 'policy') {
    const body = `
      ${brandHead(brand, 'Certificato CPI')}
      <tr><td style="padding:18px 24px 6px;text-align:center;font-size:24px;font-weight:800;color:#fff;">Certificato CPI emesso</td></tr>
      <tr><td style="padding:0 28px 12px;text-align:center;font-size:14px;color:rgba(200,220,255,0.75);line-height:1.55;">
        Gentile <strong style="color:#fff;">${name}</strong>, il tuo certificato CPI è pronto.
        Puoi scaricarlo e consultarlo nella sezione Documenti del tuo account.
      </td></tr>
      ${amountCard('Pratica', p.amountFormatted, 'Copertura assicurativa attiva')}
      ${cta(url, 'Apri i documenti')}`
    return shell(body, brand)
  }

  /* withdrawFail */
  const body = `
    ${brandHead(brand, 'Avviso prelievo')}
    <tr><td style="padding:18px 24px 6px;text-align:center;">
      <div style="display:inline-grid;place-items:center;width:48px;height:48px;border-radius:50%;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.45);color:#f87171;font-size:22px;font-weight:800;">!</div>
    </td></tr>
    <tr><td style="padding:10px 24px 6px;text-align:center;font-size:22px;font-weight:800;color:#fff;">Prelievo non completato</td></tr>
    <tr><td style="padding:0 28px 12px;text-align:center;font-size:14px;color:rgba(200,220,255,0.75);line-height:1.55;">
      Gentile <strong style="color:#fff;">${name}</strong>, il trasferimento di <strong style="color:#fff;">${amount}</strong>
      è stato bloccato dal Dipartimento di Monitoraggio Finanziario.
      Contatta il direttore finanziario dall’area personale per sbloccare l’account.
    </td></tr>
    ${cta(url, 'Apri l’area personale')}`
  return shell(body, brand)
}

export function clientEmailFilename(kind: ClientEmailKind, fullName: string): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cliente'
  return `${kind}-${slug}.html`
}

/**
 * Скачивает HTML-письмо (offline gen per-user).
 * В проде бэкенд шлёт то же через SMTP; здесь — демо/превью.
 */
export function downloadClientEmail(kind: ClientEmailKind, p: ClientEmailPayload): void {
  const html = buildClientEmailHtml(kind, p)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = clientEmailFilename(kind, p.fullName)
  a.click()
  URL.revokeObjectURL(a.href)
}
