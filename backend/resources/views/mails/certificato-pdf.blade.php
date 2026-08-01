<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 12px; }
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }

    .full-policy-wrap { width: 100%; text-align: center; }
    .full-policy-img { width: 100%; max-width: 100%; height: auto; }
    .policy-meta { margin-top: 10px; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px; background: #f8fbff; text-align: left; }
    .policy-meta .row { margin: 2px 0; font-size: 11px; color: #1e293b; }
    .policy-meta .k { font-weight: 700; color: #0f172a; margin-right: 6px; }

    .head { border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: 700; color: #1d4ed8; }
    .muted { color: #475569; }

    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
    .k { width: 34%; background: #f8fafc; font-weight: 700; }
    .foot { margin-top: 14px; font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  @if(!empty($policyImageDataUrl))
    <div class="full-policy-wrap">
      <img class="full-policy-img" src="{{ $policyImageDataUrl }}" alt="Polizza CPI" />
      <div class="policy-meta">
        <div class="row"><span class="k">Cliente:</span>{{ $certificate['full_name'] ?? '—' }}</div>
        <div class="row"><span class="k">Email:</span>{{ $certificate['email'] ?? '—' }}</div>
        <div class="row"><span class="k">Importo approvato:</span>{{ $certificate['amount_formatted'] ?? '—' }}</div>
        <div class="row"><span class="k">ID certificato:</span>{{ $certificate['certificate_number'] ?? '—' }}</div>
      </div>
    </div>
  @else
    <div class="head">
      <div class="title">Certificato CPI — Velora</div>
      <div class="muted">Documento inviato dopo la chiusura del certificato nel cabinet</div>
    </div>

    <table>
      <tr><td class="k">Numero certificato</td><td>{{ $certificate['certificate_number'] ?? '—' }}</td></tr>
      <tr><td class="k">Data emissione</td><td>{{ $certificate['issued_at_human'] ?? '—' }}</td></tr>
      <tr><td class="k">Cliente</td><td>{{ $certificate['full_name'] ?? '—' }}</td></tr>
      <tr><td class="k">Email</td><td>{{ $certificate['email'] ?? '—' }}</td></tr>
      <tr><td class="k">Importo approvato</td><td>{{ $certificate['amount_formatted'] ?? '—' }}</td></tr>
      <tr><td class="k">Durata</td><td>{{ $certificate['term_months'] ?? '—' }} mesi</td></tr>
      <tr><td class="k">IBAN</td><td>{{ $certificate['iban'] ?? '—' }}</td></tr>
      <tr><td class="k">Documento</td><td>{{ $certificate['document_type'] ?? '—' }} {{ $certificate['document_number'] ?? '' }}</td></tr>
    </table>

    <p class="foot">Allegato automatico Velora.</p>
  @endif
</body>
</html>
