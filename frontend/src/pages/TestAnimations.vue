<script setup>
import VCard from '../components/ui/VCard.vue'
import VProgress from '../components/ui/VProgress.vue'
import { ref } from 'vue'

const showMessage = ref(false)

function handleComplete() {
  showMessage.value = true
  console.log('Прогресс завершен!')
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <VCard title="🎨 Примеры анимаций" padding="lg">
      
      <!-- Прогресс бар на 10 секунд (для теста быстрее чем 1 минута) -->
      <div class="space-y-4">
        <h3 class="font-semibold text-lg">1. Прогресс бар (10 секунд)</h3>
        <VProgress :duration="10000" @complete="handleComplete" />
        
        <p v-if="showMessage" class="text-green-600 font-semibold animate-bounce">
          🎉 Анимация завершена!
        </p>
      </div>
      
      <!-- Другие примеры Tailwind анимаций -->
      <div class="mt-8 space-y-4">
        <h3 class="font-semibold text-lg">2. Встроенные Tailwind анимации</h3>
        
        <div class="p-4 bg-blue-100 rounded animate-pulse">
          animate-pulse - пульсация
        </div>
        
        <div class="p-4 bg-green-100 rounded animate-bounce">
          animate-bounce - прыгает
        </div>
        
        <div class="p-4 bg-purple-100 rounded animate-spin inline-block">
          🔄
        </div>
        <span class="ml-2">animate-spin - вращение</span>
        
        <div class="p-4 bg-yellow-100 rounded animate-ping">
          animate-ping - радиоволна
        </div>
      </div>
      
    </VCard>
  </div>
</template>
