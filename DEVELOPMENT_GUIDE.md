# 📘 Руководство для разработчиков Velora CRM

## 🏗️ Архитектура проекта

### Структура бэкенда (Laravel)
```
backend/
├── app/
│   ├── Models/          ← Модели БД (User, Document, Payment)
│   ├── Http/
│   │   ├── Controllers/ ← API контроллеры
│   │   ├── Requests/    ← Валидация входящих данных
│   │   └── Resources/   ← Форматирование ответов API
│   └── Services/        ← Бизнес-логика
├── database/
│   └── migrations/      ← Схема базы данных
└── routes/
    └── api.php          ← API маршруты
```

### Структура фронтенда (Vue 3)
```
frontend/
├── src/
│   ├── components/      ← Переиспользуемые компоненты
│   ├── views/           ← Страницы приложения
│   ├── router/          ← Навигация
│   ├── stores/          ← Глобальное состояние (Pinia)
│   └── services/        ← API запросы
└── public/              ← Статические файлы
```

---

## 📦 Правило создания нового модуля

### Пример: Добавляем модуль "Clients" (Клиенты)

#### Шаг 1: База данных
```bash
# В терминале бэкенда
php artisan make:migration create_clients_table
```

Файл: `database/migrations/2026_07_25_000000_create_clients_table.php`
```php
Schema::create('clients', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('phone')->nullable();
    $table->timestamps();
});
```

#### Шаг 2: Модель
```bash
php artisan make:model Client
```

Файл: `app/Models/Client.php`
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $fillable = ['name', 'email', 'phone'];
}
```

#### Шаг 3: Контроллер
```bash
php artisan make:controller Api/ClientController --api
```

Файл: `app/Http/Controllers/Api/ClientController.php`
```php
<?php

namespace App\Http\Controllers\Api;

use App\Models\Client;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index()
    {
        return Client::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:clients',
            'phone' => 'nullable|string',
        ]);

        return Client::create($validated);
    }

    public function show(Client $client)
    {
        return $client;
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'email|unique:clients,email,'.$client->id,
            'phone' => 'nullable|string',
        ]);

        $client->update($validated);
        return $client;
    }

    public function destroy(Client $client)
    {
        $client->delete();
        return response()->json(null, 204);
    }
}
```

#### Шаг 4: Маршруты API
Файл: `routes/api.php`
```php
use App\Http\Controllers\Api\ClientController;

Route::apiResource('clients', ClientController::class);
```

Это создаст маршруты:
- GET `/api/clients` - список клиентов
- POST `/api/clients` - создать клиента
- GET `/api/clients/{id}` - один клиент
- PUT `/api/clients/{id}` - обновить клиента
- DELETE `/api/clients/{id}` - удалить клиента

#### Шаг 5: Фронтенд - API сервис
Файл: `frontend/src/services/clientService.js`
```javascript
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://it-velora.com/api'

export default {
  async getAll() {
    const response = await axios.get(`${API_URL}/clients`)
    return response.data
  },

  async getOne(id) {
    const response = await axios.get(`${API_URL}/clients/${id}`)
    return response.data
  },

  async create(data) {
    const response = await axios.post(`${API_URL}/clients`, data)
    return response.data
  },

  async update(id, data) {
    const response = await axios.put(`${API_URL}/clients/${id}`, data)
    return response.data
  },

  async delete(id) {
    await axios.delete(`${API_URL}/clients/${id}`)
  }
}
```

#### Шаг 6: Фронтенд - Store (состояние)
Файл: `frontend/src/stores/clientStore.js`
```javascript
import { defineStore } from 'pinia'
import clientService from '@/services/clientService'

export const useClientStore = defineStore('clients', {
  state: () => ({
    clients: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchClients() {
      this.loading = true
      try {
        this.clients = await clientService.getAll()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async createClient(data) {
      const client = await clientService.create(data)
      this.clients.push(client)
      return client
    },

    async deleteClient(id) {
      await clientService.delete(id)
      this.clients = this.clients.filter(c => c.id !== id)
    }
  }
})
```

#### Шаг 7: Фронтенд - Компонент списка
Файл: `frontend/src/views/ClientsPage.vue`
```vue
<template>
  <div class="clients-page">
    <h1>Клиенты</h1>
    
    <button @click="showCreateForm = true">+ Добавить клиента</button>
    
    <div v-if="loading">Загрузка...</div>
    
    <table v-else>
      <thead>
        <tr>
          <th>Имя</th>
          <th>Email</th>
          <th>Телефон</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <td>{{ client.name }}</td>
          <td>{{ client.email }}</td>
          <td>{{ client.phone }}</td>
          <td>
            <button @click="editClient(client)">Редактировать</button>
            <button @click="deleteClient(client.id)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useClientStore } from '@/stores/clientStore'

const clientStore = useClientStore()
const { clients, loading } = storeToRefs(clientStore)

onMounted(() => {
  clientStore.fetchClients()
})

const deleteClient = async (id) => {
  if (confirm('Удалить клиента?')) {
    await clientStore.deleteClient(id)
  }
}
</script>
```

#### Шаг 8: Добавить в роутер
Файл: `frontend/src/router/index.js`
```javascript
import ClientsPage from '@/views/ClientsPage.vue'

const routes = [
  // ... существующие маршруты
  {
    path: '/clients',
    name: 'clients',
    component: ClientsPage,
    meta: { requiresAuth: true }
  }
]
```

---

## ✅ Чек-лист для нового модуля

Каждый новый модуль должен иметь:

### Бэкенд:
- [ ] Миграция БД (`create_xxx_table`)
- [ ] Модель (`app/Models/Xxx.php`)
- [ ] Контроллер (`app/Http/Controllers/Api/XxxController.php`)
- [ ] Маршруты API (`routes/api.php`)
- [ ] (Опционально) Request для валидации
- [ ] (Опционально) Resource для форматирования

### Фронтенд:
- [ ] API сервис (`services/xxxService.js`)
- [ ] Store (`stores/xxxStore.js`)
- [ ] Страница/View (`views/XxxPage.vue`)
- [ ] Компоненты (`components/Xxx/...`)
- [ ] Маршрут (`router/index.js`)

---

## 🔄 Workflow для разработчика

### 1. Получил задачу: "Добавить модуль Clients"

### 2. Создал ветку:
```bash
git checkout develop
git pull
git checkout -b feature/clients-module
```

### 3. Разработка:
- Создал миграцию → `php artisan migrate` (на dev)
- Создал модель, контроллер, routes
- Создал фронтенд сервис, store, компонент
- Проверил на `dev.it-velora.com`

### 4. Коммит:
```bash
git add .
git commit -m "Add Clients module: CRUD operations"
git push -u origin feature/clients-module
```

### 5. Pull Request:
- `feature/clients-module` → `develop`
- Ты проверяешь код
- Автоматически деплоится на dev.it-velora.com
- Тестируешь
- Мерджишь в develop

### 6. Деплой на продакшен:
- Pull Request: `develop` → `main`
- Мерджишь → автоматом на it-velora.com

---

## 🎓 Что должен знать фронтенд разработчик

### Не трогать:
- `backend/` - это не его зона
- `.github/workflows/` - CI/CD настройки
- `docker-compose*.yml` - инфраструктура

### Работать только в:
- `frontend/src/components/` - компоненты
- `frontend/src/views/` - страницы
- `frontend/src/stores/` - состояние
- `frontend/src/services/` - API запросы
- `frontend/src/router/` - навигация
- `frontend/src/assets/` - стили, картинки

### Команды для работы:
```bash
cd frontend
npm install          # установить зависимости
npm run dev          # запустить локально (http://localhost:5173)
npm run build        # собрать для production
```

### API всегда по адресу:
- **Dev:** https://dev.it-velora.com/api
- **Prod:** https://it-velora.com/api

---

## 🚀 Команды для ежедневной работы

### Фронтенд разработчик:
```bash
# Начало работы
git checkout develop
git pull
git checkout -b feature/new-button

# Работа
cd frontend
npm run dev         # локальный сервер на http://localhost:5173
# меняет код, сохраняет, видит изменения сразу

# Коммит
git add .
git commit -m "Add new button to dashboard"
git push -u origin feature/new-button

# Создаёт Pull Request в VS Code или GitHub
```

### Бэкенд разработчик (ты):
```bash
# Миграция БД
docker exec calipso_app php artisan make:migration create_something_table
docker exec calipso_app php artisan migrate

# Создание контроллера
docker exec calipso_app php artisan make:controller Api/SomethingController --api

# Просмотр маршрутов
docker exec calipso_app php artisan route:list
```

---

## ⚠️ Важные правила

1. **Всегда работай в ветке `develop`**, не в `main`
2. **Перед началом работы:** `git pull origin develop`
3. **Создавай отдельную ветку** для каждой фичи: `feature/название`
4. **Коммить часто** с понятными сообщениями
5. **Проверяй на dev.it-velora.com** перед мерджем в main
6. **Не коммить** `.env`, `node_modules`, `vendor`

---

## 📞 Куда обращаться при проблемах

1. **Не работает фронтенд локально** → проверь `npm install`
2. **Не работает API** → проверь `docker ps`, логи
3. **Не понимаешь структуру** → смотри этот файл
4. **Не знаешь как сделать** → ищи похожий модуль (например `Documents`)

---

Этот файл - твоя библия! Добавляй сюда новые правила по мере роста проекта.
