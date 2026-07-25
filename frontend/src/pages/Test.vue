<template>
  <div class="p-8">
    <h1 class="text-4xl font-bold text-green-600 mb-4">✅ Vue работает!</h1>
    <p class="text-xl mb-4">Если ты видишь этот текст - всё ОК</p>
    
    <div class="mt-8 space-y-4">
      <button 
        @click="count++"
        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg"
      >
        Кликов: {{ count }}
      </button>

      <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
        <router-link
          to="/login"
          class="block text-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
        >
          Войти
        </router-link>
        <router-link
          to="/register"
          class="block text-center bg-white border border-green-600 text-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition mt-2 sm:mt-0"
        >
          Регистрация
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
