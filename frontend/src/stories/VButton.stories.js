import VButton from '../components/ui/VButton.vue'

export default {
  title: 'UI/VButton',
  component: VButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
}

export const Primary = {
  args: {
    variant: 'primary',
    size: 'md',
    default: 'Кнопка',
  },
}

export const Secondary = {
  args: {
    variant: 'secondary',
    size: 'md',
    default: 'Вторая кнопка',
  },
}

export const Success = {
  args: {
    variant: 'success',
    size: 'md',
    default: '✅ Успешно',
  },
}

export const Danger = {
  args: {
    variant: 'danger',
    size: 'md',
    default: '❌ Удалить',
  },
}

export const Small = {
  args: {
    variant: 'primary',
    size: 'sm',
    default: 'Маленькая',
  },
}

export const Large = {
  args: {
    variant: 'primary',
    size: 'lg',
    default: 'Большая кнопка',
  },
}

export const Disabled = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
    default: 'Заблокирована',
  },
}

export const Loading = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    default: 'Загрузка...',
  },
}

export const AllVariants = {
  render: () => ({
    components: { VButton },
    template: `
      <div class="flex flex-col gap-4 p-4">
        <div class="flex gap-2">
          <VButton variant="primary">Primary</VButton>
          <VButton variant="secondary">Secondary</VButton>
          <VButton variant="success">Success</VButton>
          <VButton variant="danger">Danger</VButton>
        </div>
        <div class="flex gap-2">
          <VButton size="sm">Small</VButton>
          <VButton size="md">Medium</VButton>
          <VButton size="lg">Large</VButton>
        </div>
      </div>
    `,
  }),
}
