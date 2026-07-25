<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-8">💰 Демо уровней комиссии</h1>
    
    <!-- Админ контроль -->
    <div class="bg-white p-6 rounded-lg shadow mb-8">
      <h2 class="text-xl font-bold mb-4">🔧 Админ панель</h2>
      <div class="flex gap-4">
        <button 
          v-for="level in levels"
          :key="level.id"
          @click="currentLevel = level"
          :class="[
            'px-6 py-3 rounded-lg font-semibold transition-all',
            currentLevel.id === level.id 
              ? 'ring-4 ring-offset-2 ring-opacity-50' 
              : 'opacity-60 hover:opacity-100'
          ]"
          :style="{
            backgroundColor: level.theme.primaryColor,
            color: level.theme.textColor,
            borderColor: level.theme.primaryColor,
            '--tw-ring-color': level.theme.primaryColor
          }"
        >
          {{ level.name }}
        </button>
      </div>
    </div>

    <!-- Карточка клиента (меняется в зависимости от уровня) -->
    <div 
      class="p-8 rounded-lg shadow-xl transition-all duration-500"
      :class="currentLevel.animation"
      :style="{
        backgroundColor: currentLevel.theme.backgroundColor,
        borderLeft: `8px solid ${currentLevel.theme.primaryColor}`
      }"
    >
      <div class="flex items-center gap-4 mb-6">
        <div 
          class="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          :style="{ backgroundColor: currentLevel.theme.primaryColor }"
        >
          {{ currentLevel.icon }}
        </div>
        <div>
          <h3 class="text-2xl font-bold" :style="{ color: currentLevel.theme.primaryColor }">
            {{ currentLevel.name }}
          </h3>
          <p class="text-gray-600">{{ currentLevel.description }}</p>
        </div>
      </div>

      <!-- Данные комиссии -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white bg-opacity-50 p-4 rounded">
          <div class="text-sm text-gray-600">Базовая комиссия</div>
          <div class="text-2xl font-bold" :style="{ color: currentLevel.theme.primaryColor }">
            {{ currentLevel.commission.base }}%
          </div>
        </div>
        <div class="bg-white bg-opacity-50 p-4 rounded">
          <div class="text-sm text-gray-600">Бонус</div>
          <div class="text-2xl font-bold" :style="{ color: currentLevel.theme.primaryColor }">
            +{{ currentLevel.commission.bonus }}%
          </div>
        </div>
        <div class="bg-white bg-opacity-50 p-4 rounded">
          <div class="text-sm text-gray-600">Всего</div>
          <div class="text-2xl font-bold" :style="{ color: currentLevel.theme.primaryColor }">
            {{ currentLevel.commission.base + currentLevel.commission.bonus }}%
          </div>
        </div>
      </div>

      <!-- Особенности уровня -->
      <div class="bg-white bg-opacity-30 p-4 rounded">
        <h4 class="font-bold mb-2" :style="{ color: currentLevel.theme.primaryColor }">
          ✨ Преимущества
        </h4>
        <ul class="space-y-1">
          <li v-for="feature in currentLevel.features" :key="feature" class="text-gray-700">
            • {{ feature }}
          </li>
        </ul>
      </div>

      <!-- Прогресс до следующего уровня -->
      <div v-if="currentLevel.id < 3" class="mt-6">
        <div class="flex justify-between text-sm mb-2">
          <span>До {{ levels[currentLevel.id].name }}</span>
          <span class="font-bold">{{ currentLevel.progress }}%</span>
        </div>
        <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-1000"
            :class="currentLevel.animation"
            :style="{ 
              width: currentLevel.progress + '%',
              backgroundColor: currentLevel.theme.primaryColor 
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Код для админа -->
    <div class="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono">
      <div class="text-gray-500 mb-2">// API вызов для смены уровня:</div>
      <div>await updateClientLevel(clientId, {{ currentLevel.id }})</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Конфигурация уровней - легко редактируется админом
const levels = [
  {
    id: 0,
    name: 'Стартовый',
    icon: '🌱',
    description: 'Новый клиент',
    animation: 'animate-pulse',
    theme: {
      primaryColor: '#10b981',
      backgroundColor: '#f0fdf4',
      textColor: '#ffffff'
    },
    commission: {
      base: 1,
      bonus: 0
    },
    features: [
      'Базовая поддержка',
      'Стандартные комиссии',
      'Email уведомления'
    ],
    progress: 35
  },
  {
    id: 1,
    name: 'Серебряный',
    icon: '🥈',
    description: 'Активный партнер',
    animation: 'animate-bounce',
    theme: {
      primaryColor: '#6366f1',
      backgroundColor: '#eef2ff',
      textColor: '#ffffff'
    },
    commission: {
      base: 2,
      bonus: 0.5
    },
    features: [
      'Приоритетная поддержка',
      'Повышенные комиссии',
      'SMS уведомления',
      'Персональный менеджер'
    ],
    progress: 67
  },
  {
    id: 2,
    name: 'Золотой',
    icon: '🥇',
    description: 'VIP партнер',
    animation: 'animate-spin',
    theme: {
      primaryColor: '#f59e0b',
      backgroundColor: '#fffbeb',
      textColor: '#ffffff'
    },
    commission: {
      base: 3,
      bonus: 1.5
    },
    features: [
      'VIP поддержка 24/7',
      'Максимальные комиссии',
      'Push уведомления',
      'Личный аккаунт-менеджер',
      'Доступ к аналитике',
      'Индивидуальные условия'
    ],
    progress: 100
  },
  {
    id: 3,
    name: 'Платиновый',
    icon: '💎',
    description: 'Топ партнер',
    animation: 'animate-ping',
    theme: {
      primaryColor: '#8b5cf6',
      backgroundColor: '#faf5ff',
      textColor: '#ffffff'
    },
    commission: {
      base: 5,
      bonus: 2
    },
    features: [
      'Все из Золотого +',
      'Премиум комиссии',
      'API доступ',
      'Белая метка',
      'Персональные бонусы',
      'Участие в управлении'
    ],
    progress: 0
  }
]

const currentLevel = ref(levels[0])
</script>
