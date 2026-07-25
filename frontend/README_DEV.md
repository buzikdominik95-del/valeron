# Velora Frontend - Документация для разработчика

## 🚀 Быстрый старт

```bash
cd /var/www/calipso-v2/frontend
npm install
npm run dev
```

Dev server запустится на http://193.221.200.13:5174

## 📁 Структура проекта

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Базовые UI компоненты
│   │   │   ├── VButton.vue       ✅ Готово
│   │   │   ├── VInput.vue        ✅ Готово
│   │   │   └── VCard.vue         ✅ Готово
│   │   ├── common/               # Общие компоненты
│   │   │   ├── ErrorMessage.vue  ✅ Готово
│   │   │   └── Navigation.vue
│   │   └── forms/                # Формы (пусто, создавать по необходимости)
│   ├── pages/                    # Страницы
│   │   ├── Dashboard.vue
│   │   ├── Login.vue
│   │   ├── Register.vue          ✅ Отрефакторена
│   │   ├── Profile.vue
│   │   ├── Documents.vue
│   │   ├── Payments.vue
│   │   ├── Commissions.vue
│   │   └── admin/Tenants.vue
│   ├── stores/                   # Pinia state management
│   │   ├── authStore.js          ✅ Работает (login, register, logout)
│   │   ├── tenantStore.js        ✅ Загрузка конфигурации тенанта
│   │   └── themeStore.js         ✅ Применение темы
│   ├── services/                 # API клиенты
│   │   ├── api.js                ✅ Axios + interceptors
│   │   ├── authService.js        ✅ Auth endpoints
│   │   └── tenantService.js      ✅ Tenant endpoints
│   ├── router.js                 ✅ Vue Router
│   ├── main.js                   ✅ Entry point
│   ├── App.vue                   ✅ Root component
│   └── style.css                 ✅ Tailwind directives
├── public/
├── index.html                    ✅ HTML entry
├── package.json                  ✅ Dependencies
├── vite.config.js                ✅ Vite config
├── tailwind.config.js            ✅ Tailwind v3.4.1
├── postcss.config.js             ✅ PostCSS
├── COMPONENT_STRUCTURE.md        📚 Архитектура компонентов
└── REFACTORING_GUIDE.md          📚 Руководство по рефакторингу
```

## 🛠 Технологии

- **Vue 3.4.0** - Composition API, `<script setup>`
- **Vite 5.4.21** - Dev server + build tool
- **Pinia 2.1.7** - State management
- **Vue Router 4.3.0** - Роутинг
- **Axios 1.7.0** - HTTP клиент
- **Tailwind CSS 3.4.1** - Utility-first CSS

## 🎨 Компонентная архитектура

### Готовые компоненты

#### VButton.vue
```vue
<VButton 
  variant="primary"     <!-- primary|secondary|danger|success -->
  size="md"             <!-- sm|md|lg -->
  :loading="isLoading"
  type="submit"
>
  Сохранить
</VButton>
```

#### VInput.vue
```vue
<VInput
  v-model="email"
  type="email"
  label="Email"
  placeholder="your@email.com"
  :error="errors.email"
  required
/>
```

#### VCard.vue
```vue
<VCard 
  title="Заголовок"
  padding="lg"          <!-- none|sm|md|lg -->
  shadow="md"           <!-- none|sm|md|lg -->
>
  <p>Содержимое карточки</p>
</VCard>
```

#### ErrorMessage.vue
```vue
<ErrorMessage 
  message="Общая ошибка"
  :errors="{ email: ['Email занят'], password: ['Слишком короткий'] }"
/>
```

## 📝 Примеры использования

### Форма регистрации (рефакторена)
```vue
<script setup>
import VCard from '../components/ui/VCard.vue'
import VInput from '../components/ui/VInput.vue'
import VButton from '../components/ui/VButton.vue'
import ErrorMessage from '../components/common/ErrorMessage.vue'

const form = ref({ email: '', password: '' })
const errors = ref({})
</script>

<template>
  <VCard title="Регистрация">
    <form class="space-y-4">
      <VInput v-model="form.email" type="email" label="Email" :error="errors.email?.[0]" />
      <VInput v-model="form.password" type="password" label="Пароль" />
      <ErrorMessage :message="error" />
      <VButton type="submit" :loading="loading">Создать аккаунт</VButton>
    </form>
  </VCard>
</template>
```

## 🔌 API Integration

### Использование authStore
```js
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// Регистрация
await authStore.register({ name, email, password, password_confirmation })

// Вход
await authStore.login(email, password)

// Проверка авторизации
if (authStore.isAuthenticated) {
  // Пользователь залогинен
  console.log(authStore.user)
}

// Выход
authStore.logout()
```

### Прямые API вызовы
```js
import { authService } from '@/services/authService'

// POST /api/auth/register
const data = await authService.register({ name, email, password, password_confirmation })

// POST /api/auth/login
const data = await authService.login(email, password)

// GET /api/users/profile
const profile = await authService.getProfile()
```

## ⚙️ Backend API Endpoints

- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход (требует токен)
- `GET /api/auth/me` - Текущий пользователь (требует токен)
- `GET /api/tenants/current` - Конфигурация текущего тенанта

Все запросы автоматически включают `Bearer {token}` через axios interceptor.

## 🔧 Задачи для frontend разработчика

### День 1: Базовые компоненты
- [ ] VCheckbox.vue - чекбокс для "Запомнить меня"
- [ ] VSelect.vue - выпадающий список
- [ ] VModal.vue - модальное окно
- [ ] VTextarea.vue - многострочное поле
- [ ] LoadingSpinner.vue - индикатор загрузки

### День 2: Рефакторинг страниц
- [ ] Login.vue - переписать с VInput, VButton, VCheckbox
- [ ] Dashboard.vue - разбить на WelcomeCard, DashboardStats
- [ ] Profile.vue - форма редактирования профиля

### День 3: Таблицы и модалки
- [ ] VTable.vue - универсальная таблица
- [ ] Documents.vue - таблица документов + модалка загрузки
- [ ] Payments.vue - таблица платежей

### День 4: Специфичные компоненты
- [ ] VBadge.vue - статусы
- [ ] PaymentCard.vue - карточка платежа
- [ ] DocumentUploadForm.vue - форма загрузки

## 🎯 Правила разработки

1. **Компонентный подход**
   - Каждый UI элемент = отдельный файл
   - Переиспользуй компоненты, не дублируй код

2. **Naming conventions**
   - Компоненты UI: `V` префикс (VButton, VInput)
   - Общие компоненты: описательные (ErrorMessage, LoadingSpinner)
   - Страницы: PascalCase (Dashboard.vue, Login.vue)

3. **Props typing**
   - Всегда указывай типы и значения по умолчанию
   - Используй validators для enum-like props

4. **Tailwind CSS**
   - Используй utility классы
   - Динамические классы через `:class="[]"`
   - Избегай inline стилей

5. **State management**
   - Логика бизнеса → Pinia stores
   - Локальное состояние → `ref()` в компоненте
   - Props только для передачи данных вниз

## 📚 Полезные документы

- `COMPONENT_STRUCTURE.md` - Детальная архитектура компонентов
- `REFACTORING_GUIDE.md` - План рефакторинга страниц с примерами

## 🐛 Решенные проблемы

✅ Tailwind CSS 3.4.1 установлен (откат с v4 из-за PostCSS)  
✅ Dev server на порту 5174 (5173 занят)  
✅ AuthStore исправлен - убран лишний `.data` после axios interceptor  
✅ Register.vue отрефакторена с использованием компонентов  
✅ Laravel Sanctum настроен для API токенов  
✅ CORS и прокси настроены через Vite  

## 💻 Dev server

```bash
# Запуск dev server
npm run dev

# Build для продакшена
npm run build

# Preview production build
npm run preview
```

URL: http://193.221.200.13:5174
