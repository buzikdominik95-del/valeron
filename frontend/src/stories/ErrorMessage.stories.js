import ErrorMessage from '../components/common/ErrorMessage.vue'

export default {
  title: 'Common/ErrorMessage',
  component: ErrorMessage,
  tags: ['autodocs'],
}

export const SingleError = {
  args: {
    message: 'Произошла ошибка при сохранении данных',
  },
}

export const ValidationErrors = {
  args: {
    errors: {
      email: ['Email обязателен', 'Email должен быть корректным'],
      password: ['Пароль должен быть минимум 8 символов'],
      name: ['Имя не может быть пустым'],
    },
  },
}

export const NetworkError = {
  args: {
    message: '❌ Ошибка сети: не удалось подключиться к серверу',
  },
}

export const AuthError = {
  args: {
    message: '🔒 Доступ запрещен. Пожалуйста, войдите в систему.',
  },
}
