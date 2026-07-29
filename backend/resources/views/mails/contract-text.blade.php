Velora — Contratto firmato

Gentile {{ $contract['full_name'] ?? 'Cliente Velora' }},
la firma elettronica del suo contratto è stata registrata correttamente.

Contratto: {{ $contract['contract_number'] ?? '—' }}
Data firma: {{ $contract['signed_at_human'] ?? '—' }}
Importo: {{ $contract['amount_formatted'] ?? '—' }}

In allegato trova il PDF del contratto con i suoi dati cliente.
