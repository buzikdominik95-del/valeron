# Frontend Developer Guide

Добро пожаловать в проект Velora CRM!

## 🎯 Ваша зона ответственности

Вы работаете с **frontend частью проекта** на Vue 3 + Vite.

### Директории для работы:

```
velora/
├── frontend/
│   ├── src/
│   │   ├── pages/          ← Ваши страницы (Login.vue, Register.vue и т.д.)
│   │   ├── components/     ← Ваши компоненты
│   │   ├── stores/         ← Pinia stores (состояние приложения)
│   │   ├── services/       ← API сервисы
│   │   ├── router.js       ← Роутинг приложения
│   │   └── App.vue         ← Главный компонент
│   ├── index.html          ← Точка входа HTML
│   ├── package.json        ← Зависимости
│   └── vite.config.js      ← Конфигурация сборки
```

**❌ НЕ ТРОГАЙТЕ:**
- `backend/` - это PHP/Laravel бэкенд
- `docker-compose*.yml` - Docker конфигурация
- `nginx*.conf` - конфигурация сервера

---

## 🔄 Workflow: Как работать с кодом

### 1. Склонируйте репозиторий

```bash
git clone https://github.com/GodzilaGlue/velora.git
cd velora
```

### 2. Всегда работайте в ветке develop

```bash
git checkout develop
git pull origin develop
```

### 3. Создайте feature ветку

```bash
git checkout -b feature/dashboard-page
```

### 4. Установите зависимости

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev  # Запуск dev сервера на localhost:5173
```

### 5. Делайте изменения в frontend/src/

### 6. Коммитьте

```bash
git add .
git commit -m "feat: Add dashboard page"
```

**Правила коммитов:**
- `feat:` - новая функция
- `fix:` - исправление бага
- `style:` - стили (CSS, UI)

### 7. Пушьте в develop или свою ветку

```bash
git push origin feature/dashboard-page
```

### 8. Создайте Pull Request на GitHub

`feature/dashboard-page` → `develop`

---

## 📋 Важные правила

### ✅ МОЖНО:

- Пушить в ветку `develop`
- Создавать feature ветки
- Изменять файлы в `frontend/src/`
- Обновлять `package.json`

### ❌ НЕЛЬЗЯ:

- Пушить в `main` (только владелец)
- Мерджить PR самостоятельно
- Изменять `backend/` код
- Менять Docker/nginx конфигурацию
- Коммитить `frontend/dist/`

---

## 🌐 Окружения

- **Dev:** https://dev.it-velora.com (автодеплой из develop)
- **Production:** https://it-velora.com (только после merge в main)

---

## 📦 Пример компонента

```vue
<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue'
</script>

<style scoped>
.dashboard {
  padding: 20px;
}
</style>
```

---

## 🆘 Помощь

- Напишите владельцу проекта
- Создайте Issue в GitHub
- Документация: [Vue 3](https://vuejs.org/), [Pinia](https://pinia.vuejs.org/)

**Удачи! 🚀**
