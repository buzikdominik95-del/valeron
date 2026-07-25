<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'
import VCard from '../components/ui/VCard.vue'
import RegisterForm from '../components/forms/RegisterForm.vue'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const error = ref(null)
const errors = ref({})

async function handleRegister(formData) {
  if (formData.password !== formData.password_confirmation) {
    error.value = 'Пароли не совпадают'
    return
  }

  loading.value = true
  error.value = null
  errors.value = {}
  
  try {
    await authStore.register(formData)
    router.push('/')
  } catch (err) {
    if (err.response?.data?.errors) {
      errors.value = err.response.data.errors
      error.value = 'Проверьте правильность заполнения полей'
    } else {
      error.value = err.response?.data?.message ; 'Ошибка регистрации'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <!-- Изменили shadow с lg на xl, добавили градиент -->
    <VCard title="🚀 Присоединяйтесь к Velora" padding="lg" shadow="xl">
      <p class="text-gray-600 mb-6">Создайте аккаунт за 30 секунд</p>
      
      <RegisterForm 
        :loading="loading"
        :error="error"
        :errors="errors"
        @submit="handleRegister"
      />
      
      <div class="text-center mt-6 pt-4 border-t border-gray-200">
        <span class="text-gray-600">Уже есть аккаунт?</span>
        <router-link to="/login" class="text-green-600 hover:text-green-700 font-semibold ml-2">
          Войти →
        </router-link>
      </div>
    </VCard>
  </div>
</template>
