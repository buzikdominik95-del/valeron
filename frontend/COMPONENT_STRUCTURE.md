# Структура компонентов Velora Frontend

## 📁 Организация файлов

```
frontend/src/
├── components/
│   ├── ui/              # Базовые UI компоненты
│   │   ├── VButton.vue
│   │   ├── VInput.vue
│   │   ├── VCard.vue
│   │   └── ...
│   ├── common/          # Общие переиспользуемые компоненты
│   │   ├── ErrorMessage.vue
│   │   ├── Navigation.vue
│   │   └── ...
│   └── forms/           # Компоненты форм
│       ├── LoginForm.vue
│       └── RegisterForm.vue
├── pages/               # Страницы приложения
│   ├── Dashboard.vue
│   ├── Login.vue
│   └── Register.vue
├── stores/              # Pinia хранилища
│   ├── authStore.js
│   ├── tenantStore.js
│   └── themeStore.js
├── services/            # API сервисы
│   ├── api.js
│   └── authService.js
└── router.js            # Vue Router конфигурация
```

## 🎨 UI Компоненты

### VButton.vue
Универсальная кнопка с вариантами стилей.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'success' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `disabled`: Boolean
- `loading`: Boolean
- `type`: 'button' | 'submit' | 'reset' (default: 'button')

**Использование:**
```vue
<VButton variant="primary" size="md" :loading="isLoading" type="submit">
  Сохранить
</VButton>
```

### VInput.vue
Поле ввода с label, ошибками и валидацией.

**Props:**
- `modelValue`: String | Number (v-model)
- `type`: 'text' | 'email' | 'password' | ... (default: 'text')
- `label`: String
- `placeholder`: String
- `error`: String (сообщение об ошибке)
- `required`: Boolean
- `disabled`: Boolean
- `autocomplete`: String

**Использование:**
```vue
<VInput
  v-model="form.email"
  type="email"
  label="Email"
  placeholder="your@email.com"
  :error="errors.email?.[0]"
  required
/>
```

### VCard.vue
Контейнер-карточка для группировки контента.

**Props:**
- `title`: String (заголовок карточки)
- `padding`: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
- `shadow`: 'none' | 'sm' | 'md' | 'lg' (default: 'md')

**Использование:**
```vue
<VCard title="Регистрация" padding="lg">
  <form>...</form>
</VCard>
```

## 🔄 Пример рефакторинга страницы

### До (было):
```vue
<template>
  <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6">Регистрация</h2>
    <form @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input 
          v-model="form.email"
          type="email"
          class="w-full px-4 py-2 border rounded"
        />
      </div>
      <button 
        type="submit"
        class="w-full bg-blue-600 text-white py-2 rounded"
      >
        Отправить
      </button>
    </form>
  </div>
</template>
```

### После (стало):
```vue
<script setup>
import VCard from '@/components/ui/VCard.vue'
import VInput from '@/components/ui/VInput.vue'
import VButton from '@/components/ui/VButton.vue'

// ... логика
</script>

<template>
  <div class="max-w-md mx-auto">
    <VCard title="Регистрация" padding="lg">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <VInput
          v-model="form.email"
          type="email"
          label="Email"
          :error="errors.email?.[0]"
          required
        />
        
        <VButton 
          type="submit" 
          :loading="loading"
          class="w-full"
        >
          Отправить
        </VButton>
      </form>
    </VCard>
  </div>
</template>
```

## 📋 Правила разработки

1. **Один компонент = один файл**
   - Каждый UI элемент (кнопка, инпут, карточка) - отдельный .vue файл
   
2. **Именование компонентов**
   - UI компоненты: `V` префикс (VButton, VInput, VCard)
   - Общие компоненты: описательные имена (ErrorMessage, Navigation)
   - Формы: `*Form` суффикс (LoginForm, RegisterForm)

3. **Props и Events**
   - Всегда указывай типы props
   - Используй v-model где возможно
   - Emit события для взаимодействия с родителем

4. **Стили**
   - Используй Tailwind CSS классы
   - Динамические классы через `:class="[]"`
   - Избегай inline стилей

5. **Переиспользование**
   - Если код повторяется 2+ раза → вынеси в компонент
   - Параметризуй через props, не дублируй код

## 🚀 Следующие шаги

Компоненты для создания:
- [ ] VTable.vue - таблица с сортировкой
- [ ] VModal.vue - модальное окно
- [ ] VSelect.vue - выпадающий список
- [ ] VCheckbox.vue - чекбокс
- [ ] VRadio.vue - радио кнопка
- [ ] VTextarea.vue - многострочное поле
- [ ] VAlert.vue - уведомление/алерт
- [ ] VBadge.vue - бейдж/метка
- [ ] VPagination.vue - пагинация
- [ ] LoadingSpinner.vue - индикатор загрузки

## 📝 API Endpoints

Backend API доступен по адресу `/api`:
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `GET /api/auth/me` - текущий пользователь
- `GET /api/tenants/current` - текущий тенант

Все запросы идут через `src/services/api.js` с автоматическим добавлением Bearer токена.
