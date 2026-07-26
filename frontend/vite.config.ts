import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Куда проксировать запросы к Laravel в dev-режиме.
  // В Docker Compose это обычно имя сервиса, локально — localhost:8000.
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:8000'

  // cookieDomainRewrite здесь намеренно не задаётся: жёсткое значение 'localhost'
  // ломает вход через 127.0.0.1 и по адресу в локальной сети. Порт в домен куки
  // не входит, поэтому переписывать его и не требуется.
  const proxy = {
    target: apiTarget,
    changeOrigin: true,
  }

  return {
    plugins: [vue(), tailwindcss()],
    /*
     * Флаги сборки vue-i18n. Библиотека отдаёт один файл на все режимы работы,
     * а лишние ветки выбрасывает сборщик — но только если про них сказано явно.
     *
     * FULL_INSTALL — глобальные $t/$n и компоненты <i18n-t>. В проекте их нет
     *   ни одной штуки: все 47 файлов берут строки через useI18n().
     * LEGACY_API — Options API. createI18n уже вызывается с legacy: false,
     *   то есть этот код и так недостижим, просто не вырезался.
     * PROD_DEVTOOLS — мост к вкладке Vue DevTools в продовой сборке.
     *
     * Компилятор сообщений НЕ выключаем: строки локали содержат подстановки
     * ({amount}, {done}/{total}), и разбирает их именно он. Без него на экране
     * оказались бы фигурные скобки вместо чисел.
     */
    define: {
      __VUE_I18N_FULL_INSTALL__: 'false',
      __VUE_I18N_LEGACY_API__: 'false',
      __INTLIFY_PROD_DEVTOOLS__: 'false',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': proxy,
        // Выдача CSRF-куки для SPA-аутентификации Sanctum
        '/sanctum': proxy,
        // Авторизация приватных каналов Reverb
        '/broadcasting': proxy,
      },
    },
  }
})
