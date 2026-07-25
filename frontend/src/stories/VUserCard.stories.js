import VUserCard from '../components/ui/VUserCard.vue'

export default {
  title: 'UI/VUserCard',
  component: VUserCard,
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    role: { control: 'text' },
    avatar: { control: 'text' },
    bio: { control: 'text' },
    online: { control: 'boolean' },
    active: { control: 'boolean' },
    badge: { 
      control: 'select',
      options: ['VIP', 'Premium', 'New', 'Pro', null]
    },
    primaryColor: { control: 'color' },
    secondaryColor: { control: 'color' },
  },
}

// 1. Обычный менеджер
export const Manager = {
  args: {
    name: 'Алексей Иванов',
    role: 'Менеджер продаж',
    avatar: '👨‍💼',
    bio: 'Опыт работы 5 лет, специализация на B2B сегменте',
    online: true,
    stats: {
      clients: 45,
      deals: 128,
      revenue: 2450000
    },
    primaryColor: "#f60707",
    secondaryColor: "#06f959",
  },
}

// 2. VIP клиент
export const VIPClient = {
  args: {
    name: 'Мария Петрова',
    role: 'Директор по развитию',
    avatar: '👩‍💼',
    bio: 'Крупнейший клиент компании, приоритетное обслуживание',
    online: true,
    badge: 'VIP',
    stats: {
      clients: 15,
      deals: 89,
      revenue: 8950000
    },
    primaryColor: '#f59e0b',
    secondaryColor: '#ef4444',
  },
}

// 3. Новый сотрудник
export const NewEmployee = {
  args: {
    name: 'Дмитрий Козлов',
    role: 'Младший менеджер',
    avatar: '🧑‍💻',
    bio: 'Присоединился к команде 2 недели назад',
    online: true,
    badge: 'New',
    stats: {
      clients: 3,
      deals: 5,
      revenue: 125000
    },
    primaryColor: "#11baa6",
    secondaryColor: "#0515f1",
  },
}

// 4. Премиум партнер
export const PremiumPartner = {
  args: {
    name: 'Сергей Волков',
    role: 'Партнер Premium',
    avatar: '🤵',
    bio: 'Топ-партнер года, эксклюзивные условия сотрудничества',
    online: false,
    badge: 'Premium',
    stats: {
      clients: 156,
      deals: 342,
      revenue: 15600000
    },
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
  },
}

// 5. Неактивный пользователь
export const InactiveUser = {
  args: {
    name: 'Елена Смирнова',
    role: 'Бывший менеджер',
    avatar: '👤',
    bio: 'Аккаунт деактивирован',
    online: false,
    active: false,
    stats: {
      clients: 0,
      deals: 0,
      revenue: 0
    },
    primaryColor: '#6b7280',
    secondaryColor: '#9ca3af',
  },
}

// 6. Pro менеджер
export const ProManager = {
  args: {
    name: 'Андрей Соколов',
    role: 'Старший менеджер Pro',
    avatar: '⭐',
    bio: 'Лидер отдела, наставник для новых сотрудников',
    online: true,
    badge: 'Pro',

    stats: {
      clients: 89,
      deals: 234,
      revenue: 5670000
    },

    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    active: false
  },
}

// 7. Сетка из нескольких карточек
export const UserGrid = {
  args: {
    bio: "",
    primaryColor: "#08e2e9"
  },

  render: () => ({
    components: { VUserCard },
    template: `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        <VUserCard 
          name="Алексей" 
          role="Менеджер" 
          avatar="👨‍💼"
          :online="true"
          :stats="{ clients: 45, deals: 128, revenue: 2450000 }"
        />
        <VUserCard 
          name="Мария" 
          role="Директор" 
          avatar="👩‍💼"
          badge="VIP"
          :online="true"
          :stats="{ clients: 89, deals: 234, revenue: 8950000 }"
          primaryColor="#f59e0b"
          secondaryColor="#ef4444"
        />
        <VUserCard 
          name="Дмитрий" 
          role="Младший менеджер" 
          avatar="🧑‍💻"
          badge="New"
          :online="false"
          :stats="{ clients: 3, deals: 5, revenue: 125000 }"
          primaryColor="#10b981"
          secondaryColor="#06b6d4"
        />
      </div>
    `,
  })
}

export const Test = {
  args: {
    name: "Дмитрий Козлов",
    role: "Младший менеджер",
    avatar: "🧑‍💻",
    bio: "Присоединился к команде 2 недели назад",
    online: true,
    badge: "Pro",
    stats:{
      "clients": 3,
      "deals": 5,
      "revenue": 125000
    },
    primaryColor:"#11baa6",
    secondaryColor: "#0515f1",
    active: true
  }
};
