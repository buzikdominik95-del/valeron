<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Velora — Contratto firmato</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e0f0;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(105deg,#1d4ed8 0%,#3b82f6 45%,#60a5fa 100%);color:#fff;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:.85;font-weight:700;">Velora · Firma elettronica</div>
              <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:750;letter-spacing:-0.02em;">Contratto firmato con successo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Gentile <strong>{{ $contract['full_name'] ?? 'Cliente Velora' }}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
                la firma elettronica del suo contratto è stata registrata correttamente.
                In allegato trova il PDF del contratto con i suoi dati cliente.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <tr>
                  <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;"><strong>Contratto:</strong> {{ $contract['contract_number'] ?? '—' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;"><strong>Data firma:</strong> {{ $contract['signed_at_human'] ?? '—' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;font-size:13px;"><strong>Importo:</strong> {{ $contract['amount_formatted'] ?? '—' }}</td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
                Messaggio automatico Velora. Per assistenza risponda a questa email o contatti il supporto dal suo account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
