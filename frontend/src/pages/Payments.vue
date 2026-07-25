<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const payments = ref([])
const invoices = ref([])
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  await loadPayments()
})

async function loadPayments() {
  loading.value = true
  try {
    const [paymentsRes, invoicesRes] = await Promise.all([
      api.get('/payments'),
      api.get('/payments/invoices')
    ])
    
    payments.value = paymentsRes.data || []
    invoices.value = invoicesRes.data || []
    error.value = null
  } catch (err) {
    error.value = 'Не удалось загрузить платежи'
  } finally {
    loading.value = false
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU')
}

function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100'
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Платежи и счета</h1>
    
    <div v-if="loading" class="text-center py-8">
      Загрузка платежей...
    </div>

    <div v-else>
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">💳 Платежи</h2>
        
        <div v-if="payments.length === 0" class="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
          Платежей не найдено
        </div>

        <div v-else class="space-y-4">
          <div 
            v-for="payment in payments" 
            :key="payment.id"
            class="bg-white p-4 rounded-lg shadow"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-semibold">{{ payment.description }}</h3>
                <p class="text-sm text-gray-600">ID: {{ payment.id }}</p>
              </div>
              <span :class="['px-3 py-1 rounded', getStatusColor(payment.status)]">
                {{ payment.status }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span>{{ formatDate(payment.created_at) }}</span>
              <span class="font-semibold">{{ payment.amount }} {{ payment.currency }}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">📄 Счета</h2>
        
        <div v-if="invoices.length === 0" class="bg-gray-100 p-8 rounded-lg text-center text-gray-600">
          Счетов не найдено
        </div>

        <div v-else class="space-y-4">
          <div 
            v-for="invoice in invoices" 
            :key="invoice.id"
            class="bg-white p-4 rounded-lg shadow"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-semibold">{{ invoice.invoice_number }}</h3>
                <p class="text-sm text-gray-600">{{ formatDate(invoice.issue_date) }} - {{ formatDate(invoice.due_date) }}</p>
              </div>
              <span :class="['px-3 py-1 rounded', getStatusColor(invoice.status)]">
                {{ invoice.status }}
              </span>
            </div>
            <div class="flex justify-end">
              <span class="font-semibold">{{ invoice.amount }} {{ invoice.currency }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
