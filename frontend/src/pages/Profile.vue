<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const error = ref(null)
const success = ref(null)

const form = ref({
  name: '',
  email: '',
  phone: '',
  bio: ''
})

const user = computed(() => authStore.user)

onMounted(() => {
  if (user.value) {
    form.value = { ...user.value }
  }
})

async function saveProfile() {
  saving.value = true
  error.value = null
  success.value = null
  
  try {
    await authStore.updateProfile(form.value)
    success.value = 'Профиль успешно обновлен'
  } catch (err) {
    error.value = err.response?.data?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Мой профиль</h1>
    
    <div class="bg-white p-8 rounded-lg shadow-md">
      <form @submit.prevent="saveProfile" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Имя
          </label>
          <input 
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input 
            v-model="form.email"
            type="email"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Телефон
          </label>
          <input 
            v-model="form.phone"
            type="tel"
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            О себе
          </label>
          <textarea 
            v-model="form.bio"
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-24"
          ></textarea>
        </div>

        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>

        <div v-if="success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {{ success }}
        </div>

        <button 
          type="submit"
          :disabled="saving"
          class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded transition"
        >
          {{ saving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </form>
    </div>
  </div>
</template>
