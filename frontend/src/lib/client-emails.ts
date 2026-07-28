/**
 * 4 HTML-письма Velora (66.txt + Desktop/22/1.png, 2.png):
 *  1 welcome     — приветствие + importo approvato (фотка 1)
 *  2 contract    — Contratto firmato + PDF Contratto di credito (filled)
 *  3 policy      — Certificato CPI Velora + ФИО на бланке
 *  4 withdrawFail — отказ вывода (частые попытки)
 *
 * Дизайн = сайт: белый + синий. Вложения только к письмам (не в чат).
 */

import { fillCpiCertificatePdf } from '@/lib/fill-contract-pdf'
import { buildContrattoConsumoPdf } from '@/lib/build-contratto-pdf'

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
  /** IBAN / подпись / doc — для PDF Contratto di credito al consumo */
  iban?: string
  signatureDataUrl?: string
  docType?: string
  docNumber?: string
  issuedDate?: string
  /** Полный piano + clausole с вкладки Documenti */
  scheduleRows?: {
    index: number
    date: string
    payment: string
    principal: string
    interest: string
    residual: string
  }[]
  scheduleTotal?: {
    index: number
    date: string
    payment: string
    principal: string
    interest: string
    residual: string
  }
  clauseBlocks?: { title?: string; lead?: string; items: string[] }[]
  contractTitle?: string
  contractSubtitle?: string
  issuerLine?: string
  attachmentUrls?: { name: string; url: string }[]
}

export function clientEmailSubject(kind: ClientEmailKind, brand = 'Velora'): string {
  switch (kind) {
    case 'welcome':
      return `${brand} — Credito approvato`
    case 'contract':
      return `${brand} — Contratto di credito firmato`
    case 'policy':
      return `${brand} — Certificato CPI`
    case 'withdrawFail':
      return `${brand} — Rifiuto prelievo`
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Домен/ссылка ЛК с текущего origin (66.txt). */
export function cabinetUrlFromLocation(search = 'view=cabinet'): string {
  if (typeof window === 'undefined') return 'https://velora.example/cabinet'
  const u = new URL(window.location.href)
  u.hash = ''
  const params = new URLSearchParams(u.search)
  /* preserve other query; force cabinet entry */
  for (const part of search.split('&')) {
    const [k, v] = part.split('=')
    if (k) params.set(k, v ?? '')
  }
  u.search = params.toString()
  return u.toString()
}

function brandMark(brand: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 18px;">
    <tr>
      <td style="padding:0 8px 0 0;vertical-align:middle;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1d4ed8;"></span>
      </td>
      <td style="vertical-align:middle;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#1d4ed8;">${esc(brand)}</div>
        <div style="margin-top:2px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:600;">Credito digitale</div>
      </td>
    </tr>
  </table>`
}

/**
 * Выезжающая панель (accordion) внутри письма — не модалка.
 * Клик по тексту/chip → подтягивает PDF контракта или CPI.
 */
function docDrawerAssets(): string {
  return `
<style>
  .vel-mail-card{max-width:440px;transition:max-width .4s cubic-bezier(.22,1,.36,1)}
  .vel-mail-card.is-doc-open{max-width:min(100%,720px)}
  .vel-doc-link{color:#1d4ed8;font-weight:700;text-decoration:underline;cursor:pointer;background:none;border:0;padding:0;font:inherit}
  .vel-doc-chip{display:block;width:100%;margin:0 auto 10px;padding:12px 16px;border:1px solid #d8e0f0;border-radius:12px;background:#f8fafc;font-size:13px;text-align:center;cursor:pointer;color:#1d4ed8;font-weight:700;font-family:inherit;box-sizing:border-box;transition:border-color .15s,background .15s}
  .vel-doc-chip:hover,.vel-doc-chip.is-active{border-color:#1d4ed8;background:#eef4ff}
  .vel-doc-chip span{display:block;margin-top:4px;font-size:11px;font-weight:500;color:#94a3b8}
  .vel-doc-drawer{max-height:0;opacity:0;overflow:hidden;margin:0 16px;border-radius:14px;border:0 solid #d8e0f0;background:#0f172a;transition:max-height .45s cubic-bezier(.22,1,.36,1),opacity .28s ease,margin .35s ease,border-width .2s}
  .vel-doc-drawer.is-open{max-height:min(78vh,820px);opacity:1;margin:4px 16px 18px;border-width:1px;box-shadow:0 12px 32px rgba(15,23,42,.12)}
  .vel-doc-drawer__inner{display:flex;flex-direction:column;height:min(72vh,760px)}
  .vel-doc-drawer__bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
  .vel-doc-drawer__title{margin:0;font-size:13px;font-weight:750;color:#0f172a}
  .vel-doc-drawer__close{flex:none;padding:6px 12px;border:1px solid #d8e0f0;border-radius:999px;background:#fff;color:#334155;font-size:12px;font-weight:650;font-family:inherit;cursor:pointer}
  .vel-doc-drawer__close:hover{border-color:#1d4ed8;color:#1d4ed8}
  .vel-doc-drawer__frame{flex:1;width:100%;border:0;background:#525659;min-height:280px}
</style>
<script>
window.VEL_DOCS = window.VEL_DOCS || {};
function velOpenDocKey(key, title) {
  var src = (window.VEL_DOCS && window.VEL_DOCS[key]) || '';
  return velToggleDoc(src, title, key);
}
function velToggleDoc(src, title, key) {
  if (!src || src === '#') return false;
  var d = document.getElementById('vel-doc-drawer');
  var f = document.getElementById('vel-doc-frame');
  var t = document.getElementById('vel-doc-title');
  var card = document.getElementById('vel-mail-card');
  if (!d || !f) return false;
  var same = d.getAttribute('data-key') === key && d.classList.contains('is-open');
  if (same) {
    velCloseDoc();
    return false;
  }
  if (t) t.textContent = title || 'Documento';
  d.setAttribute('data-key', key || '');
  f.src = src;
  d.classList.add('is-open');
  if (card) card.classList.add('is-doc-open');
  try { d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  return false;
}
function velCloseDoc() {
  var d = document.getElementById('vel-doc-drawer');
  var f = document.getElementById('vel-doc-frame');
  var card = document.getElementById('vel-mail-card');
  if (f) f.src = 'about:blank';
  if (d) { d.classList.remove('is-open'); d.removeAttribute('data-key'); }
  if (card) card.classList.remove('is-doc-open');
  return false;
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') velCloseDoc();
});
</script>`
}

/** Панель-выдвижка: вставляется в тело письма (после chip). */
function docDrawerPanel(): string {
  return `<div id="vel-doc-drawer" class="vel-doc-drawer" data-key="">
  <div class="vel-doc-drawer__inner">
    <div class="vel-doc-drawer__bar">
      <p id="vel-doc-title" class="vel-doc-drawer__title">Documento</p>
      <button type="button" class="vel-doc-drawer__close" onclick="return velCloseDoc()">Chiudi ▲</button>
    </div>
    <iframe id="vel-doc-frame" class="vel-doc-drawer__frame" title="Anteprima documento"></iframe>
  </div>
</div>`
}

function shell(title: string, inner: string, brand: string, siteOrigin = ''): string {
  const b = esc(brand)
  const y = new Date().getFullYear()
  let origin = siteOrigin
  if (!origin && typeof window !== 'undefined') origin = window.location.origin
  if (!origin) origin = '#'
  const hostLabel = (() => {
    try {
      return new URL(origin).host || `${brand.toLowerCase()}.com`
    } catch {
      return `${brand.toLowerCase()}.com`
    }
  })()
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  ${docDrawerAssets()}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:32px 14px;">
    <tr><td align="center">
      <table id="vel-mail-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" class="vel-mail-card" style="background:#ffffff;border:1px solid #d8e0f0;border-radius:20px;overflow:hidden;box-shadow:0 20px 48px rgba(15,23,42,0.09);">
        ${inner}
        <tr><td style="padding:18px 28px 24px;text-align:center;border-top:1px solid #eef2ff;background:#f8fafc;">
          <div style="font-size:11px;line-height:1.55;color:#94a3b8;">
            © ${y} ${b} Credito Digitale · <a href="${esc(origin)}" style="color:#1d4ed8;text-decoration:none;font-weight:600;">${esc(hostLabel)}</a>
          </div>
          <div style="margin-top:6px;font-size:10px;line-height:1.5;color:#cbd5e1;">
            Hai ricevuto questa email perché sei registrato su ${b}.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
  ${flushDocRegistryScript()}
</body>
</html>`
}

/** CTA pill — «Vai al mio account →» (66.txt: ссылка на ЛК) */
function ctaAccount(url: string, label = 'Vai al mio account →'): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px auto 22px;">
    <tr><td align="center" bgcolor="#1d4ed8" style="border-radius:999px;box-shadow:0 8px 20px rgba(29,78,216,0.28);">
      <a href="${esc(url)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:750;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
        ${esc(label)}
      </a>
    </td></tr>
  </table>`
}

function detailRow(label: string, value: string, last = false): string {
  const border = last ? '' : 'border-bottom:1px solid #eef2ff;'
  return `<tr>
    <td style="padding:11px 14px;${border}font-size:12px;color:#64748b;font-weight:600;width:42%;vertical-align:top;">${esc(label)}</td>
    <td style="padding:11px 14px;${border}font-size:13px;color:#0f172a;font-weight:700;text-align:right;vertical-align:top;">${esc(value)}</td>
  </tr>`
}

function hasDocSrc(url?: string): boolean {
  return Boolean(
    url &&
      url !== '#' &&
      (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')),
  )
}

/** Реестр data-URL PDF → ключи (base64 не кладём в onclick — лимит атрибутов). */
const docRegistry: { key: string; url: string }[] = []

function registerDoc(url?: string): string | null {
  if (!hasDocSrc(url)) return null
  const key = `d${docRegistry.length}`
  docRegistry.push({ key, url: url! })
  return key
}

function flushDocRegistryScript(): string {
  if (!docRegistry.length) return ''
  const entries = docRegistry
    .map(({ key, url }) => `${JSON.stringify(key)}:${JSON.stringify(url)}`)
    .join(',')
  docRegistry.length = 0
  return `<script>window.VEL_DOCS=Object.assign(window.VEL_DOCS||{},{${entries}});</script>`
}

/**
 * Chip → выезд панели с PDF (контракт / CPI).
 */
function attachChip(name: string, url?: string, panelTitle?: string): string {
  const key = registerDoc(url)
  if (!key) {
    return `<div style="margin:0 auto 18px;padding:12px 16px;border:1px solid #d8e0f0;border-radius:12px;background:#f8fafc;font-size:13px;text-align:center;color:#94a3b8;">
      📄 ${esc(name)}
    </div>`
  }
  const titleJs = JSON.stringify(panelTitle || name)
  return `<button type="button" class="vel-doc-chip" onclick='return velOpenDocKey(${JSON.stringify(key)}, ${titleJs})'>
    📄 ${esc(name)}
    <span>Clicca per aprire qui sotto</span>
  </button>
  ${docDrawerPanel()}`
}

/** Синяя ссылка в тексте → та же выезжающая панель */
function inlinePdfLink(label: string, url?: string, panelTitle?: string): string {
  const key = registerDoc(url)
  if (!key) {
    return `<strong style="color:#1d4ed8;">${esc(label)}</strong>`
  }
  const titleJs = JSON.stringify(panelTitle || label)
  return `<button type="button" class="vel-doc-link" onclick='return velOpenDocKey(${JSON.stringify(key)}, ${titleJs})'>${esc(label)}</button>`
}

function siteOriginOf(p: ClientEmailPayload): string {
  try {
    return new URL(p.cabinetUrl).origin
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : ''
  }
}

/** 1 — Welcome (фотка 1) */
function buildWelcome(p: ClientEmailPayload, brand: string): string {
  const name = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const body = `
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      ${brandMark(brand)}
      <div style="font-size:15px;color:#64748b;font-weight:500;">Benvenuto,</div>
      <div style="margin-top:6px;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:#0f172a;">
        ${esc(name)} <span aria-hidden="true">👋</span>
      </div>
    </td></tr>
    <tr><td style="padding:20px 28px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(29,78,216,0.18);border-radius:16px;background:linear-gradient(160deg,#eef4ff 0%,#f8fafc 48%,#ffffff 100%);">
        <tr><td style="padding:22px 20px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#1d4ed8;font-weight:800;">Importo approvato</div>
          <div style="margin-top:10px;font-size:40px;line-height:1;font-weight:850;letter-spacing:-0.04em;color:#0f172a;font-variant-numeric:tabular-nums;">
            ${esc(p.amountFormatted)}
          </div>
          <div style="margin-top:10px;font-size:13px;color:#64748b;">pronto per essere utilizzato</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 6px;text-align:center;">
      <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">
        Il tuo credito è <strong style="color:#0e7f58;">approvato</strong> e ti aspetta nel tuo account.<br/>
        Carica i documenti e ricevi i fondi entro <strong>24–48 ore</strong>.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 4px;text-align:center;">
      ${ctaAccount(p.cabinetUrl)}
    </td></tr>
    <tr><td style="padding:4px 28px 28px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:12px;">Prossimi passi</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${stepRow(1, 'Verifica la tua email')}
        ${stepRow(2, 'Carica documento d’identità')}
        ${stepRow(3, 'Ricevi i fondi in 24–48h', true)}
      </table>
    </td></tr>`
  return shell(clientEmailSubject('welcome', brand), body, brand, siteOriginOf(p))
}

function stepRow(n: number, text: string, last = false): string {
  const mb = last ? '0' : '10px'
  return `<tr><td style="padding:0 0 ${mb};">
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="width:28px;height:28px;border-radius:50%;background:#1d4ed8;color:#fff;font-size:12px;font-weight:800;text-align:center;vertical-align:middle;line-height:28px;">${n}</td>
        <td style="padding-left:12px;font-size:14px;color:#334155;font-weight:600;vertical-align:middle;">${esc(text)}</td>
      </tr>
    </table>
  </td></tr>`
}

/** 2 — Contratto firmato (фотка 2) + PDF Contratto di credito */
function buildContract(p: ClientEmailPayload, brand: string, files: { name: string; url: string }[]): string {
  const name = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const num = p.contractNumber ?? '—'
  const attach = files[0]
  const body = `
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      ${brandMark(brand)}
      <div style="margin:0 auto 14px;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#0e7f58,#34d399);line-height:48px;font-size:22px;color:#fff;">✓</div>
      <div style="font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0f172a;">Contratto firmato!</div>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">
        Caro/a <strong style="color:#0f172a;">${esc(name)}</strong>, il tuo contratto è confermato.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(14,127,88,0.22);border-radius:16px;background:linear-gradient(160deg,#e6f8ee 0%,#f8fbf9 50%,#ffffff 100%);">
        <tr><td style="padding:20px 18px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0e7f58;font-weight:800;">Importo erogato</div>
          <div style="margin-top:8px;font-size:38px;line-height:1;font-weight:850;letter-spacing:-0.04em;color:#0f172a;font-variant-numeric:tabular-nums;">
            ${esc(p.amountFormatted)}
          </div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:12px 28px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:12px 10px;text-align:center;width:33%;background:#f8fafc;border-right:1px solid #e2e8f0;">
            <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Rata mensile</div>
            <div style="margin-top:4px;font-size:13px;font-weight:750;color:#1d4ed8;">${esc(p.installmentFormatted ?? '—')}</div>
          </td>
          <td style="padding:12px 10px;text-align:center;width:33%;background:#f8fafc;border-right:1px solid #e2e8f0;">
            <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;font-weight:800;">Durata</div>
            <div style="margin-top:4px;font-size:13px;font-weight:750;color:#0f172a;">${esc(p.durationLabel ?? '36 mesi')}</div>
          </td>
          <td style="padding:12px 10px;text-align:center;width:33%;background:#f8fafc;">
            <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;font-weight:800;">TAEG</div>
            <div style="margin-top:4px;font-size:13px;font-weight:750;color:#0e7f58;">${esc(p.tanLabel ?? '3,8%')}</div>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:12px 28px 8px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:8px;">Dettagli contratto</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
        ${detailRow('N. Contratto', num)}
        ${detailRow('Obiettivo', p.purpose || 'Credito personale')}
        ${detailRow('Firmato il', p.signedAt || '—', true)}
      </table>
    </td></tr>
    <tr><td style="padding:14px 28px 6px;text-align:center;">
      <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#64748b;">
        Il PDF del ${inlinePdfLink('Contratto di credito al consumo', attach?.url, 'Contratto di credito al consumo')}
        (firmato, con i tuoi dati) è allegato — clicca per aprirlo qui sotto.<br/>
        I fondi verranno accreditati entro <strong style="color:#1d4ed8;">24–48 ore</strong> dalla verifica dei documenti.
      </p>
      ${attachChip(
        attach?.name ?? 'Contratto_di_credito_al_consumo.pdf',
        attach?.url,
        'Contratto di credito al consumo',
      )}
      ${ctaAccount(p.cabinetUrl)}
    </td></tr>`
  return shell(clientEmailSubject('contract', brand), body, brand, siteOriginOf(p))
}

/** 3 — CPI: та же сетка, тема CPI, вложение с инициалами клиента */
function buildPolicy(p: ClientEmailPayload, brand: string, files: { name: string; url: string }[]): string {
  const name = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const num = p.contractNumber ?? '—'
  const attach = files[0]
  const body = `
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      ${brandMark(brand)}
      <div style="margin:0 auto 14px;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#1d4ed8,#60a5fa);line-height:48px;font-size:20px;color:#fff;">🛡️</div>
      <div style="font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0f172a;">Certificato CPI emesso</div>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">
        Caro/a <strong style="color:#0f172a;">${esc(name)}</strong>, il tuo certificato CPI è pronto.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(29,78,216,0.2);border-radius:16px;background:linear-gradient(160deg,#eef4ff 0%,#f8fafc 50%,#ffffff 100%);">
        <tr><td style="padding:20px 18px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#1d4ed8;font-weight:800;">Pratica protetta</div>
          <div style="margin-top:8px;font-size:34px;line-height:1;font-weight:850;letter-spacing:-0.04em;color:#0f172a;font-variant-numeric:tabular-nums;">
            ${esc(p.amountFormatted)}
          </div>
          <div style="margin-top:8px;font-size:12px;color:#64748b;">Intestatario: <strong style="color:#0f172a;">${esc(name)}</strong></div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:12px 28px 8px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:8px;">Dettagli polizza</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
        ${detailRow('Cliente', name)}
        ${detailRow('N. Pratica', num)}
        ${detailRow('Importo', p.amountFormatted)}
        ${detailRow('Tipo', 'CPI — Credito & Protezione', true)}
      </table>
    </td></tr>
    <tr><td style="padding:14px 28px 6px;text-align:center;">
      <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#64748b;">
        Il ${inlinePdfLink('certificato CPI Velora', attach?.url, 'Certificato CPI Velora')}
        con i tuoi dati (nome e cognome) è allegato — clicca per aprirlo qui sotto.<br/>
        Puoi anche aprirlo nella sezione Documenti dell’area personale.
      </p>
      ${attachChip(
        attach?.name ?? `Certificato_CPI_Velora_${name.replace(/\s+/g, '_')}.pdf`,
        attach?.url,
        'Certificato CPI Velora',
      )}
      ${ctaAccount(p.cabinetUrl)}
    </td></tr>`
  return shell(clientEmailSubject('policy', brand), body, brand, siteOriginOf(p))
}

/** 4 — Отказ вывода (частые попытки) */
function buildWithdrawFail(p: ClientEmailPayload, brand: string): string {
  const name = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const body = `
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      ${brandMark(brand)}
      <div style="margin:0 auto 14px;width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#b3261e,#ef4444);line-height:48px;font-size:22px;color:#fff;">✕</div>
      <div style="font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#0f172a;">Prelievo rifiutato</div>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#64748b;">
        Caro/a <strong style="color:#0f172a;">${esc(name)}</strong>, non è stato possibile completare il trasferimento.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid rgba(179,38,30,0.28);border-radius:16px;background:linear-gradient(160deg,#fef2f2 0%,#fff7f7 50%,#ffffff 100%);">
        <tr><td style="padding:20px 18px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#b3261e;font-weight:800;">Importo bloccato</div>
          <div style="margin-top:8px;font-size:34px;line-height:1;font-weight:850;letter-spacing:-0.04em;color:#0f172a;font-variant-numeric:tabular-nums;">
            ${esc(p.amountFormatted)}
          </div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:12px 28px 8px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:800;margin-bottom:8px;">Motivo</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
        ${detailRow('Cliente', name)}
        ${detailRow('Causa', 'Tentativi di prelievo troppo frequenti')}
        ${detailRow('Stato', 'Account limitato', true)}
      </table>
    </td></tr>
    <tr><td style="padding:14px 28px 6px;text-align:center;">
      <p style="margin:0 0 16px;font-size:13px;line-height:1.65;color:#64748b;">
        A causa di <strong>tentativi di prelievo frequenti</strong>, il Dipartimento di Monitoraggio Finanziario
        ha bloccato l’operazione. Accedi all’area personale e contatta il direttore finanziario per sbloccare l’account.
      </p>
      ${ctaAccount(p.cabinetUrl)}
    </td></tr>`
  return shell(clientEmailSubject('withdrawFail', brand), body, brand, siteOriginOf(p))
}

export function buildClientEmailHtml(kind: ClientEmailKind, p: ClientEmailPayload): string {
  /* Сброс реестра PDF перед сборкой (на случай повторных вызовов). */
  docRegistry.length = 0
  const brand = p.brand ?? 'Velora'
  const files = attachmentLabels(kind, p)
  const payload = { ...p, attachmentUrls: files }

  if (kind === 'welcome') return buildWelcome(payload, brand)
  if (kind === 'contract') return buildContract(payload, brand, files)
  if (kind === 'policy') return buildPolicy(payload, brand, files)
  return buildWithdrawFail(payload, brand)
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
 * Скачивает одно HTML-письмо.
 * PDF встроен как data: URL → клик открывает модалку в письме (не файл .pdf).
 */
export async function downloadClientEmail(
  kind: ClientEmailKind,
  p: ClientEmailPayload,
): Promise<void> {
  const built = await buildFilledAttachmentBlobs(kind, p)
  const filesWithData = await Promise.all(
    built.map(async (f) => ({
      name: f.name,
      url: await blobToDataUrl(f.blob),
    })),
  )

  const html = buildClientEmailHtml(kind, {
    ...p,
    attachmentUrls: filesWithData.length ? filesWithData : attachmentLabels(kind, p),
  })

  triggerDownload(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    clientEmailFilename(kind, p.fullName),
  )
}

function triggerDownload(blob: Blob, name: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4_000)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

function assetBase(): string {
  if (typeof window === 'undefined') return '/'
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).href
}

function fileSlug(p: ClientEmailPayload): { slug: string; num: string } {
  const slug = (p.fullName || 'Cliente')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]+/g, '')
  const num = (p.contractNumber ?? 'CIV').replace(/[^\w-]+/g, '_')
  return { slug, num }
}

function attachmentLabels(
  kind: ClientEmailKind,
  p: ClientEmailPayload,
): { name: string; url: string }[] {
  if (p.attachmentUrls?.length) return p.attachmentUrls
  const { slug, num } = fileSlug(p)
  if (kind === 'contract') {
    return [{ name: `Contratto_di_credito_al_consumo_${num}_${slug}.pdf`, url: '#' }]
  }
  if (kind === 'policy') {
    return [{ name: `Certificato_CPI_Velora_${slug}_${num}.pdf`, url: '#' }]
  }
  return []
}

/**
 *  · contract → PDF «Contratto di credito al consumo» (как anteprima в кабинете)
 *  · policy   → CPI Velora policy-template + ФИО
 */
async function buildFilledAttachmentBlobs(
  kind: ClientEmailKind,
  p: ClientEmailPayload,
): Promise<{ name: string; blob: Blob }[]> {
  if (typeof window === 'undefined') return []
  const base = assetBase()
  const { slug, num } = fileSlug(p)
  const fullName = p.fullName || `${p.firstName} ${p.lastName}`.trim() || 'Cliente'
  const stampUrl = new URL('cpi/velora-seal.png', base).href
  const lenderSigUrl = new URL('cpi/lender-signature.png', base).href

  if (kind === 'contract') {
    try {
      const bytes = await buildContrattoConsumoPdf({
        fullName,
        email: p.email,
        amountFormatted: p.amountFormatted,
        monthlyFormatted: p.installmentFormatted,
        durationLabel: p.durationLabel,
        tanLabel: p.tanLabel,
        purpose: p.purpose,
        contractNumber: p.contractNumber,
        signedAt: p.signedAt,
        issuedDate: p.issuedDate,
        docType: p.docType,
        docNumber: p.docNumber,
        iban: p.iban,
        scheduleRows: p.scheduleRows,
        scheduleTotal: p.scheduleTotal,
        clauseBlocks: p.clauseBlocks,
        title: p.contractTitle,
        subtitle: p.contractSubtitle,
        issuerLine: p.issuerLine,
        brand: p.brand,
        signatureDataUrl: p.signatureDataUrl,
        stampUrl,
        lenderSigUrl,
      })
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return [
        {
          name: `Contratto_di_credito_al_consumo_${num}_${slug}.pdf`,
          blob: new Blob([copy], { type: 'application/pdf' }),
        },
      ]
    } catch (e) {
      console.error('[mail] contratto PDF failed', e)
      return []
    }
  }

  if (kind === 'policy') {
    try {
      const templateImg = new URL('cpi/policy-template.png', base).href
      const bytes = await fillCpiCertificatePdf(
        templateImg,
        { fullName, signatureDataUrl: p.signatureDataUrl },
        { stampUrl },
      )
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return [
        {
          name: `Certificato_CPI_Velora_${slug}_${num}.pdf`,
          blob: new Blob([copy], { type: 'application/pdf' }),
        },
      ]
    } catch (e) {
      console.error('[mail] CPI PDF failed', e)
      return []
    }
  }

  return []
}
