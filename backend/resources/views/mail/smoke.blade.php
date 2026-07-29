Velora mail channel is configured correctly.

Timestamp: {{ now()->toIso8601String() }}
Environment: {{ app()->environment() }}
Mailer: {{ config('mail.default') }}
