<script setup>
defineProps({
  title: String,
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'none'].includes(value)
  },
  shadow: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'none'].includes(value)
  }
})

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
}
</script>

<template>
  <div 
    :class="[
      'bg-white rounded-lg',
      paddingClasses[padding],
      shadowClasses[shadow]
    ]"
  >
    <h2 v-if="title" class="text-2xl font-bold mb-6">{{ title }}</h2>
    <slot></slot>
  </div>
</template>
