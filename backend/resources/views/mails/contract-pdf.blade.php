<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 24px 24px 28px 24px; }
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.45; }
    .head { border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 12px; }
    .brand { font-size: 11px; color: #334155; }
    .title { margin-top: 6px; font-size: 17px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; }
    .sub { margin-top: 2px; color: #475569; font-size: 10px; }
    .meta { margin-top: 10px; color: #334155; }
    .meta b { color: #0f172a; }

    h3 { margin: 14px 0 6px; font-size: 12px; color: #1e293b; }
    p { margin: 0 0 6px; }

    .kv { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .kv td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    .kv .k { width: 34%; background: #f8fafc; font-weight: 700; color: #334155; }

    .terms { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .terms td { border: 1px solid #cbd5e1; padding: 7px 8px; }
    .terms .k { width: 33.33%; background: #f8fafc; font-size: 10px; color: #475569; text-transform: uppercase; }
    .terms .v { font-size: 12px; font-weight: 700; color: #0f172a; }

    .schedule { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; }
    .schedule th, .schedule td { border: 1px solid #cbd5e1; padding: 4px 5px; }
    .schedule th { background: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; }
    .schedule tfoot td { background: #f8fafc; font-weight: 700; }

    .clauses h4 { margin: 10px 0 4px; font-size: 11px; color: #0f172a; }
    .clauses p { margin: 0 0 4px; color: #1e293b; font-size: 10.2px; }

    .sign { margin-top: 14px; width: 100%; border-collapse: collapse; }
    .sign td { width: 50%; vertical-align: bottom; padding: 0 10px 0 0; }
    .sig-box { border-bottom: 1px solid #0f172a; min-height: 90px; display: block; padding-bottom: 4px; }
    .sig-lender { max-width: 100%; max-height: 84px; object-fit: contain; }
    .sig-borrower { max-width: 95%; max-height: 52px; object-fit: contain; }
    .sig-label { margin-top: 4px; font-size: 10px; color: #334155; }

    .foot { margin-top: 14px; font-size: 9.5px; color: #64748b; }
    .small { font-size: 10px; color: #475569; }
  </style>
</head>
<body>
  <div class="head">
    <div class="brand">Intermediario Finanziario — Milano, Italia</div>
    <div class="title">Contratto di credito al consumo</div>
    <div class="sub">ai sensi del D.Lgs. 141/2010 – Credito ai Consumatori</div>

    <div class="meta">
      Fatto a Milano, il <b>{{ $contract['signed_at_human'] ?? '—' }}</b><br>
      N. Contratto: <b>{{ $contract['contract_number'] ?? '—' }}</b>
    </div>
  </div>

  <h3>Tra i sottoscritti</h3>
  <p>Velora S.r.l., con sede in Milano (Italia), di seguito «il Prestatore», e la persona fisica di seguito indicata, di seguito «il Prenditore», si conviene e si stipula quanto segue.</p>

  <table class="kv">
    <tr><td class="k">Nome e cognome del Prenditore</td><td>{{ $contract['full_name'] ?? '—' }}</td></tr>
    <tr><td class="k">Indirizzo email</td><td>{{ $contract['email'] ?? '—' }}</td></tr>
    <tr><td class="k">Tipo di documento d’identità</td><td>{{ $contract['document_type'] ?? '—' }}</td></tr>
    <tr><td class="k">Numero del documento</td><td>{{ $contract['document_number'] ?? '—' }}</td></tr>
    <tr><td class="k">IBAN per accredito</td><td>{{ $contract['iban'] ?? '—' }}</td></tr>
  </table>

  <h3>Condizioni Finanziarie</h3>
  <table class="terms">
    <tr>
      <td class="k">Importo erogato</td>
      <td class="k">Rata mensile</td>
      <td class="k">Durata</td>
    </tr>
    <tr>
      <td class="v">{{ $contract['amount_formatted'] ?? '—' }}</td>
      <td class="v">{{ $contract['monthly_payment_formatted'] ?? '—' }}</td>
      <td class="v">{{ ($contract['term_months'] ?? '—') }} mesi</td>
    </tr>
  </table>

  <p class="small" style="margin-top:6px;">TAN Fisso: {{ number_format((float) ($contract['rate_percent'] ?? 3.8), 1, ',', '.') }}% — Tasso Annuo Nominale fisso per tutta la durata</p>
  <p class="small">Finalità del credito: {{ $contract['purpose'] ?? 'non indicata' }}</p>
  @if(!empty($contract['commission_rows']) && is_array($contract['commission_rows']))
    <p class="small" style="margin-top:6px;"><b>Commissioni incluse nel capitale:</b></p>
    <ul class="small" style="margin:0 0 6px 16px; padding:0;">
      @foreach($contract['commission_rows'] as $fee)
        <li>{{ $fee['label'] ?? 'Commissione' }}: {{ $fee['amount_formatted'] ?? '0,00 €' }}</li>
      @endforeach
    </ul>
  @endif

  <h3>Piano di Ammortamento</h3>
  <table class="schedule">
    <thead>
      <tr>
        <th>N.</th>
        <th>Data</th>
        <th>Rata totale</th>
        <th>Quota capitale</th>
        <th>Quota interessi</th>
        <th>Saldo residuo</th>
      </tr>
    </thead>
    <tbody>
      @foreach(($contract['rows'] ?? []) as $row)
        <tr>
          <td>{{ $row['index'] ?? '—' }}</td>
          <td>{{ $row['date'] ?? '—' }}</td>
          <td>{{ $row['paymentFormatted'] ?? '—' }}</td>
          <td>{{ $row['principalFormatted'] ?? '—' }}</td>
          <td>{{ $row['interestFormatted'] ?? '—' }}</td>
          <td>{{ $row['residualFormatted'] ?? '—' }}</td>
        </tr>
      @endforeach
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">Totale ({{ $contract['rows_count'] ?? 0 }} rate)</td>
        <td>{{ $contract['total_paid_formatted'] ?? '—' }}</td>
        <td>{{ $contract['amount_formatted'] ?? '—' }}</td>
        <td>{{ $contract['total_interest_formatted'] ?? '—' }}</td>
        <td>0,00 €</td>
      </tr>
    </tfoot>
  </table>

  <div class="clauses">
    <h3>Disposizioni del contratto</h3>

    <h4>1. OGGETTO DEL CONTRATTO</h4>
    <p>1.1. Il presente contratto è stipulato con l’obiettivo di fornire sostegno sociale ai cittadini e di concedere un credito sulla base delle leggi e dei regolamenti vigenti del Governo italiano che disciplinano il credito agevolato.</p>

    <h4>2. DIRITTI E OBBLIGHI DELLE PARTI</h4>
    <p><b>Obblighi del Mutuatario:</b></p>
    <p>2.1. Garantire l’utilizzo dei fondi del credito per lo scopo previsto, in conformità ai termini del presente contratto.</p>
    <p>2.2. Pagare puntualmente e integralmente il capitale e gli interessi, secondo il piano di rimborso.</p>
    <p>2.3. Fornire alla Banca informazioni veritiere sulla propria situazione finanziaria e sulle fonti di reddito.</p>
    <p>2.4. Accettare le sanzioni e le multe applicate dalla Banca in caso di ritardo nel pagamento del debito.</p>
    <p>2.5. Presentare mensilmente le ricevute di pagamento e i rendiconti finanziari.</p>
    <p>2.6. Il Prenditore si impegna a rimborsare il capitale erogato unitamente agli interessi calcolati al TAN fisso del 3,8% annuo, mediante rate mensili costanti nella misura sopra indicata.</p>

    <p><b>Obblighi della Banca:</b></p>
    <p>2.7. Concedere il credito nella forma stabilita nel contratto.</p>
    <p>2.8. Aprire un conto o utilizzare un conto esistente per la registrazione del prestito a nome del Mutuatario.</p>
    <p>2.9. Fornire al Mutuatario informazioni relative al credito.</p>
    <p>2.10. Notificare al Mutuatario l’ammortamento anticipato del debito.</p>
    <p>2.11. Informare circa le modifiche nei documenti normativi che incidono sulle condizioni del credito.</p>
    <p>2.12. Il Prestatore si impegna a erogare il capitale approvato entro 24 ore dall’avvenuta firma elettronica del presente contratto e dalla verifica positiva dei documenti.</p>

    <h4>3. PROCEDURA DI CONCESSIONE E AMMORTAMENTO DEL CREDITO</h4>
    <p>3.1. La data di concessione del credito è considerata la data di accredito dei fondi sul conto bancario del Mutuatario.</p>
    <p>3.2. L’ammortamento del capitale e il pagamento degli interessi sono effettuati mensilmente dal Mutuatario, secondo il piano di rimborso allegato al presente contratto.</p>
    <p>3.3. Se la data indicata nel piano non è un giorno lavorativo bancario, il pagamento viene rinviato al giorno lavorativo successivo.</p>
    <p>3.4. In caso di ritardo nel rimborso del debito, il saldo dovuto viene trasferito sul conto delle posizioni scadute della Banca e maturano interessi al tasso stabilito.</p>

    <h4>4. CLAUSOLE PRINCIPALI</h4>
    <p>4.4. L’accredito dei fondi del credito viene effettuato in conformità con le regole, gli standard e i regolamenti del sistema di pagamento internazionale SEPA.</p>
    <p>4.5. Il presente contratto è garantito dalla polizza assicurativa CPI fornita dal Servizio Centrale Tutela Credito.</p>
  </div>

  <table class="sign">
    <tr>
      <td>
        <span class="sig-box">
          @if(!empty($contract['lender_signature_data_url']))
            <img class="sig-lender" src="{{ $contract['lender_signature_data_url'] }}" alt="Firma del Prestatore">
          @endif
        </span>
        <div class="sig-label">Firma del Prestatore</div>
      </td>
      <td>
        <span class="sig-box">
          @if(!empty($contract['signature_data_url']))
            <img class="sig-borrower" src="{{ $contract['signature_data_url'] }}" alt="Firma del Prenditore">
          @endif
        </span>
        <div class="sig-label">Firma del Prenditore</div>
      </td>
    </tr>
  </table>

  <p class="foot">Contratto firmato il {{ $contract['signed_at_human'] ?? '—' }} · Allegato inviato automaticamente dalla piattaforma Velora.</p>
</body>
</html>
