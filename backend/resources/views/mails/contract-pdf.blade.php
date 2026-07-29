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
    <div class="title">Contratto di Credito — Velora</div>
    <div class="muted">Documento generato automaticamente dopo la firma elettronica</div>
  </div>

  <table>
    <tr><td class="k">Numero contratto</td><td>{{ $contract['contract_number'] ?? '—' }}</td></tr>
    <tr><td class="k">Data firma</td><td>{{ $contract['signed_at_human'] ?? '—' }}</td></tr>
    <tr><td class="k">Cliente</td><td>{{ $contract['full_name'] ?? '—' }}</td></tr>
    <tr><td class="k">Email</td><td>{{ $contract['email'] ?? '—' }}</td></tr>
    <tr><td class="k">Importo richiesto</td><td>{{ $contract['amount_formatted'] ?? '—' }}</td></tr>
    <tr><td class="k">Durata</td><td>{{ $contract['term_months'] ?? '—' }} mesi</td></tr>
    <tr><td class="k">IBAN</td><td>{{ $contract['iban'] ?? '—' }}</td></tr>
    <tr><td class="k">Documento</td><td>{{ $contract['document_type'] ?? '—' }} {{ $contract['document_number'] ?? '' }}</td></tr>
  </table>

  <p class="foot">
    Questo PDF è stato allegato all'email di conferma firma e contiene i dati cliente disponibili nel profilo al momento della firma.
  </p>
</body>
</html>
