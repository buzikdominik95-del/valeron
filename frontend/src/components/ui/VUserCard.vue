<template>
  <div 
    class="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    :class="{ 'opacity-50': !active }"
  >
    <!-- Аватар и статус -->
    <div class="relative">
      <div 
        class="h-32 bg-gradient-to-r"
        :style="{ backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }"
      ></div>
      <div class="absolute -bottom-12 left-6">
        <div class="relative">
          <div class="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-4xl">
            {{ avatar }}
          </div>
          <div 
            v-if="online"
            class="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full animate-pulse"
          ></div>
        </div>
      </div>
      <div v-if="badge" class="absolute top-4 right-4">
        <span class="px-3 py-1 rounded-full text-sm font-semibold text-white"
              :class="badgeColors[badge]">
          {{ badge }}
        </span>
      </div>
    </div>

    <!-- Информация -->
    <div class="pt-14 px-6 pb-6">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 class="text-xl font-bold text-gray-800">{{ name }}</h3>
          <p class="text-gray-500 text-sm">{{ role }}</p>
        </div>
        <button 
          v-if="!active"
          class="text-red-500 hover:text-red-700"
          @click="$emit('activate')"
        >
          🔒
        </button>
      </div>

      <p v-if="bio" class="text-gray-600 text-sm mb-4">{{ bio }}</p>

      <!-- Статистика -->
      <div class="grid grid-cols-3 gap-2 mb-4 text-center">
        <div>
          <div class="font-bold text-lg" :style="{ color: primaryColor }">{{ stats.clients }}</div>
          <div class="text-xs text-gray-500">Клиентов</div>
        </div>
        <div>
          <div class="font-bold text-lg" :style="{ color: primaryColor }">{{ stats.deals }}</div>
          <div class="text-xs text-gray-500">Сделок</div>
        </div>
        <div>
          <div class="font-bold text-lg" :style="{ color: primaryColor }">{{ stats.revenue }}₽</div>
          <div class="text-xs text-gray-500">Доход</div>
        </div>
      </div>

      <!-- Действия -->
      <div class="flex gap-2">
        <button 
          @click="$emit('message')"
          class="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
          :style="{ 
            backgroundColor: primaryColor,
            color: 'white'
          }"
        >
          💬 Написать
        </button>
        <button 
          @click="$emit('call')"
          class="px-4 py-2 rounded-lg border-2 font-medium transition-colors hover:bg-gray-50"
          :style="{ borderColor: primaryColor, color: primaryColor }"
        >
          📞
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'Менеджер'
  },
  avatar: {
    type: String,
    default: '👤'
  },
  bio: String,
  online: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  badge: {
    type: String,
    validator: val => ['VIP', 'Premium', 'New', 'Pro'].includes(val)
  },
  stats: {
    type: Object,
    default: () => ({
      clients: 0,
      deals: 0,
      revenue: 0
    })
  },
  primaryColor: {
    type: String,
    default: '#3b82f6'
  },
  secondaryColor: {
    type: String,
    default: '#8b5cf6'
  }
})

defineEmits(['message', 'call', 'activate'])

const badgeColors = {
  'VIP': 'bg-yellow-500',
  'Premium': 'bg-purple-500',
  'New': 'bg-green-500',
  'Pro': 'bg-blue-500'
}
</script>
