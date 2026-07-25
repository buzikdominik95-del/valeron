# Новая архитектура Calipso v2

## Обзор

Переход с монолитного PHP приложения на модульную архитектуру на базе **Laravel 11** + **Vue 3** с чистым разделением ответственности между backend и frontend.

## Проблемы текущей архитектуры

1. **Монолитный код** - 5000+ строк в одном HTML файле
2. **Все API в одном файле** - Отсутствие модульности
3. **Отсутствие сервис-слоя** - Бизнес-логика в контроллерах
4. **Хардкодированные правила комиссий** - Невозможность изменения без изменения кода
5. **Отсутствие управления состоянием** - Клиент-ориентированное управление

## Новая структура

```
/var/www/calipso-v2/
├── backend/                      # Laravel приложение
│   ├── app/
│   │   ├── Modules/             # Модули приложения
│   │   │   ├── Users/
│   │   │   │   ├── Controllers/
│   │   │   │   ├── Services/
│   │   │   │   ├── Models/
│   │   │   │   ├── Requests/
│   │   │   │   ├── Resources/
│   │   │   │   ├── Migrations/
│   │   │   │   └── Routes/
│   │   │   ├── Payments/
│   │   │   ├── Commissions/
│   │   │   ├── Workflow/
│   │   │   ├── Chat/
│   │   │   ├── Notifications/
│   │   │   └── Admin/
│   │   ├── Http/
│   │   ├── Providers/
│   │   └── Exceptions/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   ├── web.php
│   │   └── modules/
│   ├── storage/
│   ├── bootstrap/
│   ├── public/
│   ├── tests/
│   ├── composer.json
│   └── artisan
├── frontend/                     # Vue 3 приложение
│   ├── src/
│   │   ├── components/          # Переиспользуемые компоненты (<300 строк)
│   │   ├── views/               # Страницы приложения
│   │   ├── stores/              # Pinia хранилища
│   │   ├── services/            # API сервисы
│   │   ├── composables/         # Переиспользуемые логики
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
├── Dockerfile.php
├── nginx.conf
├── .env
└── .gitignore
```

## Технологический стек

### Backend
- **Framework**: Laravel 11
- **Language**: PHP 8.4+
- **Database**: PostgreSQL 16
- **Cache/Sessions**: Redis 7
- **Task Queue**: Laravel Queue (Redis driver)
- **WebSockets**: Laravel Reverb

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript 5+
- **State Management**: Pinia
- **UI Framework**: Tailwind CSS 3
- **Build Tool**: Vite 5
- **HTTP Client**: Axios

### DevOps
- **Containers**: Docker + Docker Compose
- **Web Server**: Nginx
- **SSL**: Let's Encrypt / Certbot
- **Process Manager**: Supervisor (локально)

## Модульная архитектура

### Принципы
1. **Service Layer Pattern** - Контроллеры делегируют бизнес-логику сервисам
2. **Repository Pattern** - Абстракция доступа к данным
3. **Value Objects** - Типизированные объекты значений
4. **Single Responsibility** - Каждый класс одну обязанность
5. **Dependency Injection** - Инъекция зависимостей

### Модуль Users (Ядро)
```php
// app/Modules/Users/Services/AuthService.php
class AuthService {
    public function register(RegisterRequest $request): User
    public function login(LoginRequest $request): array
    public function logout(Request $request): bool
    public function refreshToken(RefreshTokenRequest $request): array
}

// app/Modules/Users/Services/DocumentService.php
class DocumentService {
    public function uploadDocument(UploadRequest $request): Document
    public function approveDocument(Document $doc): bool
    public function rejectDocument(Document $doc, string $reason): bool
}

// app/Modules/Users/Services/WithdrawalService.php
class WithdrawalService {
    public function requestWithdrawal(WithdrawalRequest $request): Withdrawal
    public function processWithdrawal(Withdrawal $withdrawal): bool
    public function cancelWithdrawal(Withdrawal $withdrawal): bool
}
```

### Модуль Commissions (Бизнес-логика)

**Commission Engine** - Центральная система управления комиссиями

```php
// app/Modules/Commissions/Engines/CommissionEngine.php
class CommissionEngine {
    // Вычисление комиссии на основе правил в БД
    public function calculateCommission(User $user, float $amount): CommissionCalculation
    
    // Переход между уровнями комиссий
    public function transitionLevel(User $user, CommissionLevel $level): bool
    
    // История всех изменений
    public function getHistory(User $user): Collection
    
    // Применение правил
    public function applyRules(User $user): void
}

// app/Modules/Commissions/Models/CommissionLevel.php
class CommissionLevel extends Model {
    protected $attributes = [
        'name' => string,
        'percentage' => float,
        'min_amount' => float,
        'max_amount' => float,
        'status' => 'active|inactive|archived'
    ];
}

// app/Modules/Commissions/Models/CommissionHistory.php
class CommissionHistory extends Model {
    protected $attributes = [
        'user_id' => UUID,
        'from_level_id' => UUID|null,
        'to_level_id' => UUID|null,
        'amount_processed' => float,
        'commission_earned' => float,
        'triggered_by' => 'rule|manual|system',
        'metadata' => JSON
    ];
}
```

### Модуль Workflow (State Machine)

**Workflow Engine** - Управление жизненным циклом клиента

```php
// app/Modules/Workflow/Engines/WorkflowEngine.php
class WorkflowEngine {
    // Определенные состояния
    const STATES = [
        'initial',
        'documents_pending',
        'documents_approved',
        'contract_signed',
        'active',
        'suspended',
        'completed',
        'rejected'
    ];
    
    // Валидные переходы
    public function canTransition(User $user, string $to): bool
    
    // Выполнить переход
    public function transitionTo(User $user, string $to, array $data = []): WorkflowInstance
    
    // История всех переходов (audit trail)
    public function getAuditTrail(User $user): Collection
    
    // События переходов
    public function onStateChanged(string $event, callable $callback): void
}

// app/Modules/Workflow/Models/WorkflowInstance.php
class WorkflowInstance extends Model {
    protected $attributes = [
        'user_id' => UUID,
        'current_state' => string,
        'transitions' => JSON,  // История переходов с timestamps
        'metadata' => JSON
    ];
}
```

### Модуль Chat (WebSockets)

```php
// app/Modules/Chat/Services/ChatService.php
class ChatService {
    public function sendMessage(SendMessageRequest $request): Message
    public function getConversation(User $user, User $other): Collection
    public function markAsRead(Message $message): bool
}

// Broadcasting channel
Broadcast::channel('chat.{user_id}', function ($user, $user_id) {
    return $user->id === (int)$user_id;
});
```

## Frontend архитектура

### Компоненты (<300 строк)
```vue
<!-- src/components/auth/LoginForm.vue -->
<script setup lang="ts">
import { reactive } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import type { LoginRequest } from '@/types/auth'

const authStore = useAuthStore()
const form = reactive<LoginRequest>({
  email: '',
  password: ''
})
const errors = reactive({})
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    await authStore.login(form)
  } catch (error) {
    Object.assign(errors, error.response.data.errors)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.email" type="email" placeholder="Email">
    <span v-if="errors.email" class="text-red-500">{{ errors.email[0] }}</span>
    
    <input v-model="form.password" type="password" placeholder="Password">
    <span v-if="errors.password" class="text-red-500">{{ errors.password[0] }}</span>
    
    <button :disabled="loading" type="submit">
      {{ loading ? 'Loading...' : 'Login' }}
    </button>
  </form>
</template>
```

### Pinia Store

```typescript
// src/stores/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { User, LoginRequest, RegisterRequest } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  
  const isAuthenticated = computed(() => !!token.value)
  
  const login = async (credentials: LoginRequest) => {
    const { data } = await api.post('/auth/login', credentials)
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('token', token.value)
  }
  
  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }
  
  return { user, token, isAuthenticated, login, logout }
})
```

## Миграция данных

### Из MySQL в PostgreSQL
```sql
-- Миграция таблицы leads → users
INSERT INTO users (id, email, phone, first_name, last_name, created_at)
SELECT 
  uuid_generate_v4(),
  email,
  phone,
  first_name,
  last_name,
  created_at
FROM old_db.leads
WHERE email IS NOT NULL;

-- Миграция комиссий
INSERT INTO commissions (id, user_id, amount, percentage, created_at)
SELECT 
  uuid_generate_v4(),
  u.id,
  c.amount,
  c.level_percentage,
  c.created_at
FROM old_db.commissions c
JOIN users u ON u.email = c.user_email;
```

## Правила кодирования (обязательные)

### PHP Backend
```php
// 1. Service Layer Pattern
class UserController extends Controller {
    public function __construct(private AuthService $authService) {}
    
    public function store(RegisterRequest $request): JsonResponse {
        $user = $this->authService->register($request->validated());
        return response()->json($user, 201);
    }
}

// 2. Type Hints везде
public function calculateCommission(User $user, float $amount): CommissionCalculation

// 3. Максимум 50 строк в методе
// 4. Используй traits для переиспользуемого кода
// 5. Все константы в UPPER_SNAKE_CASE
```

### Vue 3 Frontend
```typescript
// 1. Composition API + script setup
<script setup lang="ts">
const count = ref(0)
const double = computed(() => count.value * 2)
</script>

// 2. TypeScript везде
interface User {
  id: string
  email: string
  name: string
}

// 3. Максимум 300 строк на компонент
// 4. Используй composables для логики
// 5. Используй Pinia для состояния
```

## План развертывания (7 фаз)

### Фаза 1: Инфраструктура (Дни 1-2)
- ✅ Установить Docker на сервер
- ✅ Настроить PostgreSQL, Redis, Nginx
- ✅ Настроить SSL
- Развернуть на 193.221.200.13

### Фаза 2: Users Module (Дни 3-4)
- Создать структуру модуля
- Реализовать AuthService, RegistrationService
- Мигрировать leads → users
- Добавить документы и IBAN управление

### Фаза 3: Frontend Auth (Дни 4-5)
- Инициализировать Vue 3 + Vite
- Создать LoginForm, RegisterForm
- Создать Pinia auth store
- Добавить JWT обработку

### Фаза 4: Commissions Engine (Дни 6-8)
- Создать CommissionEngine
- Реализовать database-driven правила
- Создать история и аудит
- API endpoints для управления уровнями

### Фаза 5: Workflow Engine (Дни 8-10)
- Реализовать WorkflowEngine
- Определить все состояния и переходы
- Добавить audit trail
- Интегрировать с event broadcasting

### Фаза 6: Chat Module (Дни 10-12)
- Создать ChatService
- Интегрировать Laravel Reverb
- WebSocket handlers
- Frontend chat компоненты

### Фаза 7: Admin Dashboard (Дни 12-15)
- Admin модуль с правами
- Dashboard с аналитикой
- Управление комиссиями
- Управление клиентами

## Развертывание

```bash
# На сервере
cd /tmp
wget https://your-repo/deploy.sh
chmod +x deploy.sh
./deploy.sh

# Результат: /var/www/calipso-v2
# Учетные данные: /root/.calipso_credentials
# Доступ: https://calipso-it.com
```

## Мониторинг

```bash
# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs -f app

# Логи веб-сервера
docker-compose logs -f nginx

# Логи БД
docker-compose logs -f postgres

# Shell в контейнере
docker-compose exec app bash
```

## Безопасность

1. ✅ JWT токены для API
2. ✅ CSRF protection в формах
3. ✅ Rate limiting на endpoints
4. ✅ SQL injection protection (Eloquent ORM)
5. ✅ XSS protection (Vue template escaping)
6. ✅ SSL/TLS для всех соединений
7. ✅ Переменные окружения для secrets
8. ✅ Audit trail для всех операций

## Метрики успеха

- Снижение кода с 5000+ в одном файле до <300 строк на компонент
- 100% тестовое покрытие для бизнес-логики
- Время отклика API <100ms (p95)
- Zero downtime развертывание
- Полная история всех операций
- Real-time чат без задержек

