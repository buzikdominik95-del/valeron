import VInput from '../components/ui/VInput.vue'

export default {
  title: 'UI/VInput',
  component: VInput,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    type: { 
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel']
    },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
}

export const Default = {
  args: {
    label: 'Имя пользователя',
    placeholder: 'Введите имя',
    modelValue: '',
  },
}

export const Email = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    modelValue: '',
  },
}

export const Password = {
  args: {
    label: 'Пароль',
    type: 'password',
    placeholder: '••••••••',
    modelValue: '',
  },
}

export const WithError = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    modelValue: 'invalid-email',
    error: 'Введите корректный email адрес',
  },
}

export const Disabled = {
  args: {
    label: 'Поле заблокировано',
    placeholder: 'Недоступно',
    disabled: true,
    modelValue: '',
  },
}

export const Required = {
  args: {
    label: 'Обязательное поле',
    placeholder: 'Введите значение',
    required: true,
    modelValue: '',
  },
}
