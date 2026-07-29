<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 12px; }
    .head { border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 18px; }
    .title { font-size: 20px; font-weight: 700; color: #1d4ed8; }
    .muted { color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
    .k { width: 34%; background: #f8fafc; font-weight: 700; }
    .foot { margin-top: 26px; font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <div class="head">
    <div class="title">Certificato CPI — Velora</div>
    <div class="muted">Documento inviato dopo la chiusura del certificato nel cabinet</div>
  </div>

  <table>
    <tr><td class="k">Numero certificato</td><td>{{ $certificate['certificate_number'] ?? '—' }}</td></tr>
    <tr><td class="k">Data emissione</td><td>{{ $certificate['issued_at_human'] ?? '—' }}</td></tr>
    <tr><td class="k">Cliente</td><td>{{ $certificate['full_name'] ?? '—' }}</td></tr>
    <tr><td class="k">Email</td><td>{{ $certificate['email'] ?? '—' }}</td></tr>
    <tr><td class="k">Importo pratica</td><td>{{ $certificate['amount_formatted'] ?? '—' }}</td></tr>
    <tr><td class="k">Durata</td><td>{{ $certificate['term_months'] ?? '—' }} mesi</td></tr>
    <tr><td class="k">IBAN</td><td>{{ $certificate['iban'] ?? '—' }}</td></tr>
    <tr><td class="k">Documento</td><td>{{ $certificate['document_type'] ?? '—' }} {{ $certificate['document_number'] ?? '' }}</td></tr>
  </table>

  <p class="foot">
    PDF allegato automaticamente all'email Certificato CPI con i dati cliente disponibili nel profilo al momento della chiusura del documento.
  </p>
</body>
</html>
