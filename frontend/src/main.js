import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as Sentry from '@sentry/vue'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// 🔥 SENTRY MONITORING
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'development',
  })
  console.log('📊 Sentry enabled')
}

// 🔥 ОБРАБОТКА ОШИБОК
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ Vue Error:', err)
  console.error('📍 Component:', instance)
  console.error('ℹ️ Info:', info)
  
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: monospace; background: #1e1e1e; color: #fff; min-height: 100vh;">
        <h1 style="color: #ff6b6b; font-size: 32px; margin-bottom: 20px;">❌ Ошибка Vue</h1>
        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffd93d; margin-bottom: 10px;">Сообщение:</h2>
          <pre style="color: #ff6b6b; white-space: pre-wrap;">${err.message}</pre>
        </div>
        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #ffd93d; margin-bottom: 10px;">Стек:</h2>
          <pre style="color: #6bcfff; white-space: pre-wrap; font-size: 12px;">${err.stack || 'Нет стека'}</pre>
        </div>
        <div style="background: #2d2d2d; padding: 20px; border-radius: 8px;">
          <h2 style="color: #ffd93d; margin-bottom: 10px;">Где:</h2>
          <pre style="color: #95e1d3;">${info}</pre>
        </div>
      </div>
    `
  }
}

window.addEventListener('unhandledrejection', event => {
  console.error('❌ Unhandled Promise:', event.reason)
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: monospace; background: #1e1e1e; color: #fff;">
        <h1 style="color: #ff6b6b;">❌ Promise Error</h1>
        <pre style="color: #ff6b6b;">${event.reason}</pre>
      </div>
    `
  }
})

try {
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
  console.log('✅ Vue started')
} catch (error) {
  console.error('❌ Init error:', error)
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error)
  }
  document.body.innerHTML = `
    <div style="padding: 40px; background: #1e1e1e; color: #fff;">
      <h1 style="color: #ff6b6b;">❌ Init Error</h1>
      <pre>${error.stack}</pre>
    </div>
  `
}
