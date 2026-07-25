<template>
  <div class="p-8">
    <h1 class="text-4xl font-bold text-green-600 mb-4">✅ Vue работает!</h1>
    <p class="text-xl mb-4">Если ты видишь этот текст - всё ОК</p>
    
    <div class="mt-8">
      <button 
        @click="count++"
        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg"
      >
        Кликов: {{ count }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
