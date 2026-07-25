<script setup>
defineProps({
  message: String,
  errors: Object
})
</script>

<template>
  <div v-if="message || errors" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    <p v-if="message">{{ message }}</p>
    <ul v-if="errors" class="list-disc list-inside">
      <li v-for="(errorList, field) in errors" :key="field">
        {{ errorList[0] }}
      </li>
    </ul>
  </div>
</template>
