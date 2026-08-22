<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->configureRealtimeBroadcasting();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Keep the native admin/cabinet WebSocket clients and Laravel Reverb on
     * the same application when a deployed .env still contains the old
     * BROADCAST_CONNECTION=log defaults.
     *
     * Explicit Reverb credentials remain authoritative.  The fallback is
     * deterministic for the Docker stacks and is never enabled in tests.
     */
    private function configureRealtimeBroadcasting(): void
    {
        if ($this->app->environment('testing')) {
            return;
        }

        $key = trim((string) config('broadcasting.connections.reverb.key'));
        $secret = trim((string) config('broadcasting.connections.reverb.secret'));
        $appId = trim((string) config('broadcasting.connections.reverb.app_id'));
        $needsFallbackCredentials = $key === '' || $secret === '' || $appId === '';

        config(['broadcasting.default' => 'reverb']);

        if (!$needsFallbackCredentials) {
            return;
        }

        if ($key === '') {
            $key = 'dev-key';
        }
        if ($secret === '') {
            $secret = hash_hmac('sha256', 'velora-reverb', (string) config('app.key', 'velora'));
        }
        if ($appId === '') {
            $appId = 'velora';
        }

        $publishHost = $this->app->environment('production') ? 'reverb' : 'reverb_dev';
        $publicHost = (string) (parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost');

        config([
            'broadcasting.connections.reverb.key' => $key,
            'broadcasting.connections.reverb.secret' => $secret,
            'broadcasting.connections.reverb.app_id' => $appId,
            'broadcasting.connections.reverb.options.host' => $publishHost,
            'broadcasting.connections.reverb.options.port' => 8080,
            'broadcasting.connections.reverb.options.scheme' => 'http',
            'broadcasting.connections.reverb.options.useTLS' => false,
            'reverb.apps.apps.0.key' => $key,
            'reverb.apps.apps.0.secret' => $secret,
            'reverb.apps.apps.0.app_id' => $appId,
            'reverb.apps.apps.0.options.host' => $publicHost,
            'reverb.apps.apps.0.options.port' => 443,
            'reverb.apps.apps.0.options.scheme' => 'https',
            'reverb.apps.apps.0.options.useTLS' => true,
        ]);
    }
}
