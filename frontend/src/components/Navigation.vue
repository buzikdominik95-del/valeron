<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userName = computed(() => authStore.user?.name)
const isAdmin = computed(() => authStore.isAdmin)

function logout() {
  authStore.logout()
  router.push('/login')
}

function navigateTo(path) {
  router.push(path)
}
</script>

<template>
  <nav class="bg-white shadow-md">
    <div class="container mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold text-primary">Velora</h1>
      </div>

      <div v-if="isAuthenticated" class="flex items-center gap-4">
        <button 
          @click="navigateTo('/profile')"
          class="text-gray-700 hover:text-primary transition"
        >
          {{ userName }}
        </button>
        
        <button 
          @click="navigateTo('/documents')"
          class="text-gray-700 hover:text-primary transition"
        >
          Документы
        </button>

        <button 
          @click="navigateTo('/payments')"
          class="text-gray-700 hover:text-primary transition"
        >
          Платежи
        </button>

        <button 
          @click="navigateTo('/commissions')"
          class="text-gray-700 hover:text-primary transition"
        >
          Комиссии
        </button>

        <button 
          v-if="isAdmin"
          @click="navigateTo('/admin/tenants')"
          class="text-gray-700 hover:text-primary transition font-semibold"
        >
          🔧 Администрация
        </button>

        <button 
          @click="logout"
          class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Выход
        </button>
      </div>

      <div v-else class="flex items-center gap-2">
        <button 
          @click="navigateTo('/login')"
          class="text-gray-700 hover:text-primary transition"
        >
          Вход
        </button>
        
        <button 
          @click="navigateTo('/register')"
          class="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Регистрация
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.primary {
  color: var(--color-primary);
}
</style>
