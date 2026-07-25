<script setup>
import { onMounted } from 'vue'
import { useTenantStore } from './stores/tenantStore'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import Navigation from './components/Navigation.vue'

const tenantStore = useTenantStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(async () => {
  try {
    // Load tenant config from current domain
    await tenantStore.loadTenant()
    
    // Apply theme
    themeStore.applyTheme(tenantStore.theme)
    
    // Check if user is logged in
    if (authStore.token) {
      await authStore.loadUser()
    }
  } catch (error) {
    console.error('App initialization error:', error)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navigation />
    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
}
</style>
