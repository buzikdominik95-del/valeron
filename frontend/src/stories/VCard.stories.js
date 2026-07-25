import VCard from '../components/ui/VCard.vue'
import VButton from '../components/ui/VButton.vue'

export default {
  title: 'UI/VCard',
  component: VCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg']
    },
    shadow: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg']
    },
  },
}

export const Default = {
  args: {
    title: 'Карточка по умолчанию',
    default: 'Это содержимое внутри карточки',
  },
}

export const WithTitle = {
  args: {
    title: '🎯 Заголовок карточки',
    default: 'Текст внутри карточки с заголовком',
  },
}

export const NoPadding = {
  args: {
    title: 'Без отступов',
    padding: 'none',
    default: 'Контент прилипает к краям',
  },
}

export const LargeShadow = {
  args: {
    title: 'Большая тень',
    shadow: 'lg',
    default: "Эта карточка выглядит приподнятой изменена с помощью стори",
    padding: "md"
  },
}

export const ComplexContent = {
  render: () => ({
    components: { VCard, VButton },
    template: `
      <VCard title="📊 Статистика проекта" padding="lg" shadow="md">
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-600">152</div>
              <div class="text-sm text-gray-600">Пользователей</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">89%</div>
              <div class="text-sm text-gray-600">Активность</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-600">2.4K</div>
              <div class="text-sm text-gray-600">Документов</div>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <VButton variant="secondary" size="sm">Обновить</VButton>
            <VButton variant="primary" size="sm">Подробнее</VButton>
          </div>
        </div>
      </VCard>
    `,
  }),
}
