import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '@fontsource-variable/inter'
import '@/assets/styles/main.css'
import { i18n } from '@/i18n'
import App from '@/App.vue'

/**
 * Плагины GSAP регистрируются один раз на приложение — здесь.
 * Внутри компонентов registerPlugin звать нельзя: это работа на каждый монтаж
 * и лишний повод забыть про неё в новом файле. После этой строки ScrollTrigger
 * доступен и через `scrollTrigger: {…}` в параметрах твина, без импорта.
 */
gsap.registerPlugin(ScrollTrigger)

createApp(App).use(createPinia()).use(i18n).mount('#app')
