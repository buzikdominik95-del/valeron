<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Velora — Credito approvato</title>
</head>
<body style="margin:0;padding:0;background:#eef1f8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f8;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e0f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:0;background:linear-gradient(105deg,#1d4ed8 0%,#3b82f6 45%,#60a5fa 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:22px 24px 18px;">
                    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.78);font-weight:700;">
                      Velora · Area personale
                    </div>
                    <div style="margin-top:8px;font-size:22px;line-height:1.25;font-weight:750;color:#ffffff;letter-spacing:-0.02em;">
                      Credito approvato
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#0f172a;">
                Gentile <strong style="font-weight:700;">{{ $fullName }}</strong>,
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
                abbiamo il piacere di informarla che la sua richiesta di credito è stata
                <strong style="color:#0b7d4e;">approvata</strong>. Di seguito i dettagli principali.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid rgba(11,125,78,0.22);border-radius:14px;background:linear-gradient(155deg,#e6f8ee 0%,#f8fbf9 55%,#ffffff 100%);">
                <tr>
                  <td style="padding:18px 18px 16px;">
                    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#0b7d4e;font-weight:700;">
                      Importo approvato
                    </div>
                    <div style="margin-top:6px;font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-0.03em;color:#0b7d4e;font-variant-numeric:tabular-nums;">
                      {{ $amountFormatted }}
                    </div>
                    <div style="margin-top:8px;font-size:12px;color:#5b678f;">
                      TAN fisso 3,8% · Erogazione tramite partner SEPA
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <tr>
                  <td style="padding:14px 16px;width:50%;vertical-align:top;">
                    <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;">Nome</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:650;color:#0f172a;">{{ $firstName !== '' ? $firstName : '—' }}</div>
                  </td>
                  <td style="padding:14px 16px;width:50%;vertical-align:top;border-left:1px solid #e2e8f0;">
                    <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:700;">Cognome</div>
                    <div style="margin-top:4px;font-size:14px;font-weight:650;color:#0f172a;">{{ $lastName !== '' ? $lastName : '—' }}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
                Acceda alla sua area personale Velora per firmare il contratto, caricare i documenti
                e completare l’accredito.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
                <tr>
                  <td align="center" bgcolor="#1d4ed8" style="border-radius:999px;">
                    <a href="{{ $cabinetUrl }}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:750;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      Apri l’area personale
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;">
                Oppure apra questo link:<br>
                <a href="{{ $cabinetUrl }}" style="color:#1d4ed8;word-break:break-all;">{{ $cabinetUrl }}</a>
              </p>
              <p style="margin:0 0 22px;font-size:13px;line-height:1.55;color:#64748b;">
                Se non ha avviato lei questa richiesta, ignori pure questo messaggio oppure contatti
                l’assistenza Velora.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid #eef2ff;background:#f8fafc;">
              <div style="font-size:12px;font-weight:700;color:#1d4ed8;">Velora S.r.l.</div>
              <div style="margin-top:4px;font-size:11px;line-height:1.5;color:#94a3b8;">
                Messaggio automatico · Non rispondere a questa email<br>
                © {{ date('Y') }} Velora — Credito preferenziale al 3,8%
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
