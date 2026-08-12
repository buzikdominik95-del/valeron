<?php

namespace App\Support;

use Illuminate\Http\Request;

class ClientIp
{
    /**
     * Реальный IP клиента за Cloudflare/nginx.
     * request()->ip() без trustProxies возвращает IP прокси (CF edge),
     * поэтому в первую очередь читаем CF-Connecting-IP / X-Real-IP.
     */
    public static function from(Request $request): string
    {
        foreach (['CF-Connecting-IP', 'X-Real-IP'] as $header) {
            $value = trim((string) $request->header($header, ''));
            if ($value !== '' and filter_var($value, FILTER_VALIDATE_IP)) {
                return $value;
            }
        }

        $xff = trim((string) $request->header('X-Forwarded-For', ''));
        if ($xff !== '') {
            $first = trim(explode(',', $xff)[0]);
            if ($first !== '' and filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }

        return (string) ($request->ip() ?? '');
    }
}
