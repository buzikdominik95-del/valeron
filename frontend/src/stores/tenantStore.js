import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tenantService } from '../services/tenantService'

export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref(null)
  const theme = ref({
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    logo_url: null,
    favicon_url: null,
    custom_css: ''
  })
  const loading = ref(false)
  const error = ref(null)

  async function loadTenant() {
    loading.value = true
    try {
      const response = await tenantService.getTenant()
      tenant.value = response.data || response
      
      // Merge theme config
      if (tenant.value?.theme_config) {
        theme.value = {
          ...theme.value,
          ...tenant.value.theme_config
        }
      }
      
      error.value = null
    } catch (err) {
      error.value = err.message
      console.error('Failed to load tenant:', err)
    } finally {
      loading.value = false
    }
  }

  async function updateTheme(newTheme) {
    try {
      theme.value = { ...theme.value, ...newTheme }
      if (tenant.value) {
        await tenantService.updateTheme(tenant.value.id, newTheme)
      }
      error.value = null
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    tenant,
    theme,
    loading,
    error,
    loadTenant,
    updateTheme
  }
})
