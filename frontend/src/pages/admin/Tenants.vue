<script setup>
import { ref, onMounted } from 'vue'
import { tenantService } from '../../services/tenantService'

const tenants = ref([])
const loading = ref(false)
const error = ref(null)
const showCreateForm = ref(false)
const showDuplicateForm = ref(false)
const selectedTenant = ref(null)

const newTenant = ref({
  name: '',
  domain: ''
})

const duplicateData = ref({
  name: '',
  domain: ''
})

onMounted(async () => {
  await loadTenants()
})

async function loadTenants() {
  loading.value = true
  try {
    const response = await tenantService.getAllTenants()
    tenants.value = response.data || []
    error.value = null
  } catch (err) {
    error.value = 'Не удалось загрузить сайты'
  } finally {
    loading.value = false
  }
}

async function createTenant() {
  try {
    await tenantService.createTenant({
      name: newTenant.value.name,
      domain: newTenant.value.domain,
      theme_config: {
        primary_color: '#3b82f6',
        secondary_color: '#8b5cf6'
      }
    })
    newTenant.value = { name: '', domain: '' }
    showCreateForm.value = false
    await loadTenants()
  } catch (err) {
    error.value = 'Ошибка создания сайта'
  }
}

async function duplicateTenant() {
  try {
    await tenantService.duplicateTenant(
      selectedTenant.value.id,
      duplicateData.value.name,
      duplicateData.value.domain
    )
    duplicateData.value = { name: '', domain: '' }
    showDuplicateForm.value = false
    selectedTenant.value = null
    await loadTenants()
  } catch (err) {
    error.value = 'Ошибка копирования сайта'
  }
}

function openDuplicateForm(tenant) {
  selectedTenant.value = tenant
  showDuplicateForm.value = true
}

function closeDuplicateForm() {
  showDuplicateForm.value = false
  selectedTenant.value = null
  duplicateData.value = { name: '', domain: '' }
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">🔧 Управление сайтами</h1>
      <button 
        @click="showCreateForm = true"
        class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded transition"
      >
        + Новый сайт
      </button>
    </div>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      {{ error }}
    </div>

    <!-- Create Form -->
    <div v-if="showCreateForm" class="bg-white p-6 rounded-lg shadow mb-6">
      <h2 class="text-xl font-semibold mb-4">Создать новый сайт</h2>
      
      <form @submit.prevent="createTenant" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Название
          </label>
          <input 
            v-model="newTenant.name"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Домен
          </label>
          <input 
            v-model="newTenant.domain"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div class="flex gap-2">
          <button 
            type="submit"
            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition"
          >
            Создать
          </button>
          <button 
            type="button"
            @click="showCreateForm = false"
            class="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded transition"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>

    <!-- Duplicate Form -->
    <div v-if="showDuplicateForm" class="bg-white p-6 rounded-lg shadow mb-6">
      <h2 class="text-xl font-semibold mb-4">
        Копировать сайт "{{ selectedTenant?.name }}"
      </h2>
      
      <form @submit.prevent="duplicateTenant" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Название копии
          </label>
          <input 
            v-model="duplicateData.name"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Домен копии
          </label>
          <input 
            v-model="duplicateData.domain"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <p class="text-sm text-blue-600 bg-blue-50 p-3 rounded">
          ℹ️ Копия будет создана со всеми настройками оформления оригинала
        </p>

        <div class="flex gap-2">
          <button 
            type="submit"
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition"
          >
            Копировать
          </button>
          <button 
            type="button"
            @click="closeDuplicateForm"
            class="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded transition"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>

    <!-- Tenants List -->
    <div v-if="loading" class="text-center py-8">
      Загрузка сайтов...
    </div>

    <div v-else-if="tenants.length === 0" class="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
      Сайтов не найдено
    </div>

    <div v-else class="grid gap-4">
      <div 
        v-for="tenant in tenants" 
        :key="tenant.id"
        class="bg-white p-6 rounded-lg shadow"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-semibold">{{ tenant.name }}</h3>
            <p class="text-sm text-gray-600">{{ tenant.domain }}</p>
            <p class="text-xs text-gray-500">ID: {{ tenant.id }}</p>
          </div>
          <span :class="[
            'px-3 py-1 rounded text-white text-sm',
            tenant.status === 'active' ? 'bg-green-500' : tenant.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
          ]">
            {{ tenant.status }}
          </span>
        </div>

        <div v-if="tenant.theme_config" class="mb-4 p-3 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">
            <span v-if="tenant.theme_config.primary_color" class="inline-block mr-2">
              🎨 {{ tenant.theme_config.primary_color }}
            </span>
          </p>
        </div>

        <div class="flex gap-2">
          <router-link 
            :to="`/admin/tenants/${tenant.id}`"
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 rounded transition"
          >
            Редактировать
          </router-link>
          
          <button 
            @click="openDuplicateForm(tenant)"
            class="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded transition"
          >
            📋 Копировать
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
