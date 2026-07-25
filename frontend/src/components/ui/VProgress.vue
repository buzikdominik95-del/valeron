<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  duration: {
    type: Number,
    default: 60000  // 60 секунд = 1 минута
  }
})

const emit = defineEmits(['complete'])

const progress = ref(0)        // 0-100%
const isComplete = ref(false)  // показывать ли кнопку
let timer = null

function startProgress() {
  const startTime = Date.now()
  const endTime = startTime + props.duration
  
  timer = setInterval(() => {
    const now = Date.now()
    const elapsed = now - startTime
    const percentage = Math.min((elapsed / props.duration) * 100, 100)
    
    progress.value = percentage
    
    if (percentage >= 100) {
      clearInterval(timer)
      isComplete.value = true
      emit('complete')
    }
  }, 50)  // обновление каждые 50мс = плавная анимация
}

onMounted(() => {
  startProgress()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Прогресс бар -->
    <div v-if="!isComplete" class="space-y-2">
      <div class="flex justify-between text-sm text-gray-600">
        <span>Загрузка...</span>
        <span>{{ Math.round(progress) }}%</span>
      </div>
      
      <!-- Серый фон прогресс-бара -->
      <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <!-- Синяя полоска с transition -->
        <div 
          class="h-full bg-blue-600 transition-all duration-100 ease-linear"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
    </div>
    
    <!-- Кнопка с пульсацией появляется после завершения -->
    <Transition name="fade">
      <button
        v-if="isComplete"
        class="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold
               hover:bg-green-700 transition-colors
               animate-pulse shadow-lg shadow-green-500/50"
      >
        ✨ Готово! Нажмите здесь
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Плавное появление кнопки */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
