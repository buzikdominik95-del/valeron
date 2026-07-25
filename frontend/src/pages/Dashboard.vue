<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const isAuthenticated = computed(() => authStore.isAuthenticated)

function goToLogin() {
  router.push('/login')
}

function goToRegister() {
  router.push('/register')
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div v-if="!isAuthenticated" class="text-center py-16">
      <h1 class="text-4xl font-bold mb-4">Добро пожаловать в Velora</h1>
      <p class="text-xl text-gray-600 mb-8">
        Многотенантная платформа с управлением документами, платежами и комиссиями
      </p>
      
      <div class="flex gap-4 justify-center">
        <button 
          @click="goToLogin"
          class="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg transition"
        >
          Войти
        </button>
        
        <button 
          @click="goToRegister"
          class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg text-lg transition"
        >
          Создать аккаунт
        </button>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-xl font-semibold mb-2">📄 Документы</h3>
        <p class="text-gray-600 mb-4">Загружайте и управляйте своими документами</p>
        <router-link to="/documents" class="text-blue-500 hover:underline">
          Перейти →
        </router-link>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-xl font-semibold mb-2">💳 Платежи</h3>
        <p class="text-gray-600 mb-4">История ваших платежей и счетов</p>
        <router-link to="/payments" class="text-blue-500 hover:underline">
          Перейти →
        </router-link>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-xl font-semibold mb-2">💰 Комиссии</h3>
        <p class="text-gray-600 mb-4">Отслеживание ваших комиссий и выводов</p>
        <router-link to="/commissions" class="text-blue-500 hover:underline">
          Перейти →
        </router-link>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-xl font-semibold mb-2">👤 Профиль</h3>
        <p class="text-gray-600 mb-4">Управление вашим профилем и настройками</p>
        <router-link to="/profile" class="text-blue-500 hover:underline">
          Перейти →
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-primary {
  background-color: var(--color-primary);
}

.text-primary {
  color: var(--color-primary);
}
</style>
