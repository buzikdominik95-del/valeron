<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EuroClear — Canale di pagamento bloccato</title>
</head>
<body style="margin:0;padding:0;background:#eef3fb;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3fb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e0f0;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(105deg,#0b3ea8 0%,#2563eb 55%,#38bdf8 100%);color:#fff;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:.92;font-weight:700;">EuroClear · Security Check</div>
              <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:760;letter-spacing:-0.02em;">Canale di pagamento bloccato</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Gentile <strong>{{ $mail['full_name'] ?? 'Cliente Velora' }}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
                il sistema di sicurezza ha rilevato <strong>attività sospette</strong> e ha
                <strong>bloccato il canale di pagamento</strong>, annullando l’attuale autorizzazione
                al prelievo fondi.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff;">
                <tr><td style="padding:12px 14px;border-bottom:1px solid #dbeafe;font-size:13px;"><strong>Cliente:</strong> {{ $mail['full_name'] ?? '—' }}</td></tr>
                <tr><td style="padding:12px 14px;border-bottom:1px solid #dbeafe;font-size:13px;"><strong>Email:</strong> {{ $mail['email'] ?? '—' }}</td></tr>
                <tr><td style="padding:12px 14px;border-bottom:1px solid #dbeafe;font-size:13px;"><strong>Stato:</strong> Autorizzazione al prelievo annullata</td></tr>
                <tr><td style="padding:12px 14px;font-size:13px;"><strong>Data evento:</strong> {{ $mail['event_at_human'] ?? '—' }}</td></tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
                Per proseguire, attenda il contatto del Suo manager per la verifica di sicurezza.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
