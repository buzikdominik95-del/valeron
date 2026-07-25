import { defineStore } from 'pinia'
import { computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  function applyTheme(themeConfig) {
    // Set CSS variables for theme colors
    const root = document.documentElement
    
    if (themeConfig.primary_color) {
      root.style.setProperty('--color-primary', themeConfig.primary_color)
    }
    if (themeConfig.secondary_color) {
      root.style.setProperty('--color-secondary', themeConfig.secondary_color)
    }

    // Apply logo
    if (themeConfig.logo_url) {
      const logoElement = document.querySelector('img[class*="logo"]')
      if (logoElement) {
        logoElement.src = themeConfig.logo_url
      }
    }

    // Apply favicon
    if (themeConfig.favicon_url) {
      const faviconElement = document.querySelector('link[rel="icon"]')
      if (faviconElement) {
        faviconElement.href = themeConfig.favicon_url
      } else {
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = themeConfig.favicon_url
        document.head.appendChild(link)
      }
    }

    // Apply custom CSS
    if (themeConfig.custom_css) {
      let styleElement = document.querySelector('style[data-custom-css]')
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.setAttribute('data-custom-css', 'true')
        document.head.appendChild(styleElement)
      }
      styleElement.textContent = themeConfig.custom_css
    }
  }

  return {
    applyTheme
  }
})
