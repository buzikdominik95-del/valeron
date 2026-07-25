<script setup>
import { ref } from 'vue'
import VInput from '../ui/VInput.vue'
import VButton from '../ui/VButton.vue'
import ErrorMessage from '../common/ErrorMessage.vue'

const props = defineProps({
  loading: Boolean,
  error: String,
  errors: Object
})

const emit = defineEmits(['submit'])

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: ''
})

function handleSubmit() {
  emit('submit', form.value)
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <VInput
      v-model="form.name"
      label="Имя"
      placeholder="Иван Иванов"
      :error="errors?.name?.[0]"
      required
    />

    <VInput
      v-model="form.email"
      type="email"
      label="Email адрес"
      placeholder="ivan@example.com"
      :error="errors?.email?.[0]"
      autocomplete="email"
      required
    />

    <VInput
      v-model="form.password"
      type="password"
      label="Пароль"
      placeholder="Минимум 6 символов"
      :error="errors?.password?.[0]"
      autocomplete="new-password"
      required
    />

    <VInput
      v-model="form.password_confirmation"
      type="password"
      label="Подтвердите пароль"
      placeholder="Повторите пароль"
      autocomplete="new-password"
      required
    />

    <ErrorMessage :message="error" />

    <VButton 
      type="submit" 
      variant="success"
      size="lg"
      :loading="loading"
      class="w-full"
    >
      ✨ Создать аккаунт
    </VButton>
  </form>
</template>
