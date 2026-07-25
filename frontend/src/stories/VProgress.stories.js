import VProgress from '../components/ui/VProgress.vue'

export default {
  title: 'UI/VProgress',
  component: VProgress,
  tags: ['autodocs'],
  argTypes: {
    duration: {
      control: 'number',
    },
  },
}

export const Default = {
  args: {
    duration: 10000,
  },
}

export const Fast = {
  args: {
    duration: 5000,
  },
}

export const Slow = {
  args: {
    duration: 30000,
  },
}

export const Demo = {
  render: () => ({
    components: { VProgress },
    template: `
      <div class="p-8">
        <h3 class="text-xl font-bold mb-4">Прогресс бар с завершением</h3>
        <VProgress 
          :duration="15000" 
          @complete="alert('Завершено!')"
        />
      </div>
    `,
  }),
}
