Velora — Rifiuto prelievo

Gentile {{ $mail['full_name'] ?? 'Cliente Velora' }},
abbiamo rilevato più tentativi ravvicinati di prelievo.
Per motivi di sicurezza l’erogazione è stata temporaneamente sospesa.

Cliente: {{ $mail['full_name'] ?? '—' }}
Email: {{ $mail['email'] ?? '—' }}
Importo: {{ $mail['amount_formatted'] ?? '—' }}
IBAN: {{ $mail['iban'] ?? '—' }}
Ora evento: {{ $mail['event_at_human'] ?? '—' }}

Per sbloccare l’operazione, completi il pagamento della copertura assicurativa dal cabinet.
