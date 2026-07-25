<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const form = ref({
  email: '',
  password: ''
})
const loading = ref(false)
const error = ref(null)

async function handleSubmit() {
  loading.value = true
  error.value = null
  
  try {
    await authStore.login(form.value.email, form.value.password)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка входа'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6">Вход</h2>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input 
          v-model="form.email"
          type="email" 
          required
          class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Пароль
        </label>
        <input 
          v-model="form.password"
          type="password" 
          required
          class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          placeholder="••••••••"
        />
      </div>

      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {{ error }}
      </div>

      <button 
        type="submit"
        :disabled="loading"
        class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded transition"
      >
        {{ loading ? 'Загрузка...' : 'Войти' }}
      </button>
    </form>

    <p class="text-center mt-4 text-gray-600">
      Нет аккаунта?
      <router-link to="/register" class="text-blue-500 hover:underline">
        Зарегистрируйтесь
      </router-link>
    </p>
  </div>
</template>
