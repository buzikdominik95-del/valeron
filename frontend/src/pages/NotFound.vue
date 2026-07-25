<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="max-w-md mx-auto text-center py-16">
    <h1 class="text-6xl font-bold mb-4">404</h1>
    <p class="text-xl text-gray-600 mb-8">Страница не найдена</p>
    
    <button 
      @click="router.push('/')"
      class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded transition"
    >
      Вернуться на главную
    </button>
  </div>
</template>
