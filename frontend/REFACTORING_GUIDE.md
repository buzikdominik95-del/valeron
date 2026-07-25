# Руководство по рефакторингу страниц

## ✅ Сделано

### Register.vue
Переписана с использованием компонентов:
- `VCard` - контейнер формы
- `VInput` - поля ввода (имя, email, пароли)
- `VButton` - кнопка отправки
- `ErrorMessage` - вывод ошибок

**Результат:** Код сократился с 130 строк до 95, улучшилась читаемость.

## 📝 План рефакторинга

### 1. Login.vue
**Текущее состояние:** HTML формы с inline классами  
**План:**
```vue
<VCard title="Вход">
  <form @submit.prevent="handleLogin" class="space-y-4">
    <VInput
      v-model="form.email"
      type="email"
      label="Email"
      :error="errors.email"
    />
    
    <VInput
      v-model="form.password"
      type="password"
      label="Пароль"
      :error="errors.password"
    />
    
    <div class="flex items-center">
      <VCheckbox v-model="form.remember">Запомнить меня</VCheckbox>
    </div>
    
    <ErrorMessage :message="error" />
    
    <VButton type="submit" :loading="loading" class="w-full">
      Войти
    </VButton>
  </form>
</VCard>
```

### 2. Dashboard.vue
**Текущее состояние:** Условный рендеринг welcome screen  
**План:**
- Создать `WelcomeCard.vue` компонент
- Создать `DashboardStats.vue` для статистики
- Создать `QuickActions.vue` для быстрых действий

```vue
<template>
  <div v-if="!isAuthenticated">
    <WelcomeCard />
  </div>
  
  <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <DashboardStats />
    <QuickActions />
  </div>
</template>
```

### 3. Documents.vue
**План:**;
- `VTable` - таблица документов
- `VModal` - модалка загрузки
- `VBadge` - статусы документов
- `UploadButton` - кнопка загрузки

```vue
<VCard title="Документы">
  <template #actions>
    <VButton @click="showUploadModal = true">
      Загрузить документ
    </VButton>
  </template>
  
  <VTable
    :columns="columns"
    :data="documents"
    :loading="loading"
    @row-click="viewDocument"
  />
  
  <VModal v-model="showUploadModal" title="Загрузка документа">
    <DocumentUploadForm @success="handleUploadSuccess" />
  </VModal>
</VCard>
```

### 4. Payments.vue
**План:**
- `PaymentCard.vue` - карточка платежа
- `PaymentStatusBadge.vue` - статус
- `PaymentForm.vue` - форма создания

### 5. Commissions.vue
**План:**
- `CommissionCalculator.vue` - калькулятор
- `CommissionChart.vue` - график комиссий
- `CommissionTable.vue` - таблица

## 🎯 Приоритеты

1. **Высокий приоритет** - базовые UI компоненты:
   - ✅ VButton
   - ✅ VInput
   - ✅ VCard
   - ✅ ErrorMessage
   - [ ] VCheckbox
   - [ ] VSelect
   - [ ] VModal
   - [ ] VTable

2. **Средний приоритет** - страницы:
   - ✅ Register.vue
   - [ ] Login.vue
   - [ ] Dashboard.vue
   - [ ] Documents.vue

3. **Низкий приоритет** - специфичные компоненты:
   - [ ] PaymentCard.vue
   - [ ] CommissionCalculator.vue
   - [ ] DocumentUploadForm.vue

## 💡 Советы по рефакторингу

1. **Начни с UI компонентов**
   - Сначала создай все базовые компоненты (VCheckbox, VSelect, VModal)
   - Затем переходи к рефакторингу страниц

2. **Тестируй по ходу**
   - Рефакторь по одной странице
   - Проверяй работоспособность после каждого изменения

3. **Сохраняй функциональность**
   - Логика остается в `<script setup>`
   - Компоненты только для UI

4. **Используй TypeScript** (опционально)
   - Добавь типы для props
   - Улучши автодополнение в IDE

## 📦 Компоненты для создания (чек-лист)

### Формы
- [ ] VCheckbox.vue
- [ ] VRadio.vue
- [ ] VSelect.vue
- [ ] VTextarea.vue
- [ ] VDatePicker.vue
- [ ] VFileUpload.vue

### UI
- [ ] VModal.vue
- [ ] VTable.vue
- [ ] VPagination.vue
- [ ] VTabs.vue
- [ ] VAccordion.vue
- [ ] VDropdown.vue

### Обратная связь
- [ ] VAlert.vue
- [ ] VToast.vue
- [ ] LoadingSpinner.vue
- [ ] VProgress.vue

### Навигация
- [ ] VBreadcrumbs.vue
- [ ] VSidebar.vue
- [ ] VNavItem.vue

### Данные
- [ ] VBadge.vue
- [ ] VTag.vue
- [ ] VAvatar.vue
- [ ] VTooltip.vue

## 🔧 Конфигурация Vite

Добавь алиасы для удобного импорта:

```js
// vite.config.js
export default {
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@ui': '/src/components/ui',
      '@pages': '/src/pages',
      '@stores': '/src/stores'
    }
  }
}
```

Тогда импорты станут короче:
```js
import VButton from '@ui/VButton.vue'
import { useAuthStore } from '@stores/authStore'
```
