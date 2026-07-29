Velora — Certificato CPI

Gentile {{ $certificate['full_name'] ?? 'Cliente Velora' }},
il suo certificato CPI è disponibile.

Certificato: {{ $certificate['certificate_number'] ?? '—' }}
Data: {{ $certificate['issued_at_human'] ?? '—' }}
Importo pratica: {{ $certificate['amount_formatted'] ?? '—' }}

In allegato trova il PDF Certificato con i dati cliente.
