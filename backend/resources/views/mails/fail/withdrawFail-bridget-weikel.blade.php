<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Velora — Account temporaneamente sospeso</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e0f0;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(105deg,#b3261e 0%,#ef4444 45%,#f97316 100%);color:#fff;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:.9;font-weight:700;">Velora · Sicurezza account</div>
              <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:750;letter-spacing:-0.02em;">Account temporaneamente sospeso</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.55;">Gentile <strong>{{ $mail['full_name'] ?? 'Cliente Velora' }}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
                a causa di <strong>frequenti richieste di prelievo</strong> e di
                <strong>attività sospette</strong> rilevate sul Suo profilo, il Suo account è stato
                <strong>temporaneamente congelato</strong> a scopo precauzionale.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;"><strong>Cliente:</strong> {{ $mail['full_name'] ?? '—' }}</td></tr>
                <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;"><strong>Email:</strong> {{ $mail['email'] ?? '—' }}</td></tr>
                <tr><td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;"><strong>Stato:</strong> Account congelato temporaneamente</td></tr>
                <tr><td style="padding:12px 14px;font-size:13px;"><strong>Data evento:</strong> {{ $mail['event_at_human'] ?? '—' }}</td></tr>
              </table>

              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
                Per <strong>sbloccare il Suo account</strong> e ripristinare l’accesso completo ai fondi,
                La invitiamo a contattare il Suo manager personale.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
                <tr>
                  <td align="center">
                    <a href="https://telegram.me/Matteo_Urbano"
                       style="display:inline-block;padding:14px 34px;background:linear-gradient(105deg,#0ea5e9 0%,#2563eb 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:0.02em;">
                      Contatta il manager
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
                Il nostro specialista verificherà la Sua identità e La assisterà nella riattivazione dell’account.
                Se il pulsante non funziona, apra questo link: <a href="https://telegram.me/Matteo_Urbano" style="color:#2563eb;">https://telegram.me/Matteo_Urbano</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
