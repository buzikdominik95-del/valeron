<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const commissions = ref([])
const stats = ref(null)
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  await loadCommissions()
})

async function loadCommissions() {
  loading.value = true
  try {
    const [commissionsRes, statsRes] = await Promise.all([
      api.get('/commissions'),
      api.get('/commissions/stats')
    ])
    
    commissions.value = commissionsRes.data || []
    stats.value = statsRes.data || {}
    error.value = null
  } catch (err) {
    error.value = 'Не удалось загрузить комиссии'
  } finally {
    loading.value = false
  }
}

async function requestPayout() {
  if (confirm('Запросить выплату?')) {
    try {
      await api.post('/commissions/payout-request')
      await loadCommissions()
    } catch (err) {
      error.value = 'Ошибка запроса'
    }
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU')
}

function getStatusColor(status) {
  return status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Мои комиссии</h1>
    
    <div v-if="loading" class="text-center py-8">
      Загрузка комиссий...
    </div>

    <div v-else>
      <div v-if="stats" class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-gray-600 mb-2">Всего заработано</p>
          <p class="text-2xl font-bold">{{ stats.total_earned }} ₽</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-gray-600 mb-2">В ожидании</p>
          <p class="text-2xl font-bold text-yellow-600">{{ stats.pending_count }}</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow text-center">
          <p class="text-gray-600 mb-2">К выплате</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.pending_amount }} ₽</p>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow mb-6 flex justify-between items-center">
        <p>Есть средства в статусе "Ожидание"?</p>
        <button 
          @click="requestPayout"
          class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded transition"
        >
          Запросить выплату
        </button>
      </div>

      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        {{ error }}
      </div>

      <div v-if="commissions.length === 0" class="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
        Комиссий не найдено
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="commission in commissions" 
          :key="commission.id"
          class="bg-white p-4 rounded-lg shadow"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold">Комиссия #{{ commission.id }}</h3>
              <p class="text-sm text-gray-600">{{ commission.percentage }}% от платежа {{ commission.payment_id }}</p>
              <p class="text-sm text-gray-600">Рассчитана: {{ formatDate(commission.calculated_at) }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold text-lg">{{ commission.amount }} ₽</p>
              <span :class="['px-3 py-1 rounded text-sm', getStatusColor(commission.status)]">
                {{ commission.status === 'paid' ? 'Выплачено' : 'Ожидание' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
