import axios from 'axios'

export const tenantService = {
  // Get current tenant config from API
  getTenant: async () => {
    try {
      const response = await axios.get('/api/tenants/current', {
        headers: { 'X-Tenant-Domain': window.location.hostname }
      })
      return response.data
    } catch (error) {
      console.error('Failed to fetch tenant config:', error)
      return { theme_config: {} }
    }
  },

  // Get tenant by ID
  getTenantById: (id) =>
    axios.get(`/api/admin/tenants/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }),

  // List all tenants (admin only)
  getAllTenants: () =>
    axios.get('/api/admin/tenants', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }),

  // Create tenant (admin only)
  createTenant: (data) =>
    axios.post('/api/admin/tenants', data, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }),

  // Duplicate tenant (admin only) - CRITICAL FOR SITE CLONING
  duplicateTenant: (tenantId, name, domain) =>
    axios.post(`/api/admin/tenants/${tenantId}/duplicate`, { name, domain }, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }),

  // Update tenant theme (admin only)
  updateTheme: (tenantId, themeConfig) =>
    axios.put(`/api/admin/tenants/${tenantId}/theme`, themeConfig, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
}
