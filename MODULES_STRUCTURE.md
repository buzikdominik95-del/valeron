# CALIPSO V2 - МОДУЛИ И СТРУКТУРА

## 📁 Структура модулей (FINAL)

### Каждый модуль содержит:

```
app/Modules/{Module}/
├── Controllers/          # HTTP контроллеры
│   ├── AuthController.php (для Users)
│   ├── UserController.php (для Users)
│   └── {Module}Controller.php
├── Services/             # Бизнес-логика
│   ├── AuthService.php (для Users)
│   ├── UserService.php (для Users)
│   └── {Module}Service.php
├── Repositories/         # Доступ к данным
│   ├── UserRepository.php
│   └── UserRepositoryInterface.php
├── Models/              # Eloquent модели
│   ├── User.php
│   ├── Document.php (для Users)
│   ├── Iban.php (для Users)
│   └── {Module}.php
├── Requests/            # Валидация (Form Requests)
│   ├── RegisterRequest.php
│   ├── LoginRequest.php
│   ├── Create{Module}Request.php
│   └── Update{Module}Request.php
├── Resources/           # JSON Response трансформеры
│   ├── UserResource.php
│   └── {Module}Resource.php
├── Routes/
│   └── api.php          # API маршруты для модуля
├── Providers/
│   └── {Module}ServiceProvider.php
├── Events/              # События
├── Jobs/                # Queue Jobs
├── Listeners/           # Event Listeners
├── Policies/            # Authorization Policies
├── Enums/               # PHP Enums
├── Exceptions/          # Кастомные исключения
├── Traits/              # Переиспользуемые трейты
├── Migrations/          # Database migrations
├── Seeders/             # Database seeders
└── Tests/
    ├── Feature/         # Feature тесты
    └── Unit/            # Unit тесты
```

## 📦 МОДУЛИ (7 всего)

### 1️⃣ Users Module
**Папка**: `app/Modules/Users/`
**Файлы созданы**:
- ✅ Controllers: AuthController, UserController
- ✅ Services: AuthService, UserService
- ✅ Repositories: UserRepository, UserRepositoryInterface
- ✅ Models: User, Document, Iban
- ✅ Requests: RegisterRequest, LoginRequest
- ✅ Resources: UserResource
- ✅ Routes: api.php
- ✅ Providers: UsersServiceProvider

**Функции**:
- User registration & authentication
- Document management
- IBAN/Bank account management
- User profile management

---

### 2️⃣ Payments Module
**Папка**: `app/Modules/Payments/`
**Структура готова для разработки**

**Функции**:
- Payment processing
- Invoice generation
- Payment history tracking
- Payment method management

---

### 3️⃣ Commissions Module
**Папка**: `app/Modules/Commissions/`
**Структура готова для разработки**

**Функции**:
- Commission calculations
- Commission reports
- Payout management
- Commission history

---

### 4️⃣ Workflow Module
**Папка**: `app/Modules/Workflow/`
**Структура готова для разработки**

**Функции**:
- Process automation
- Approval workflows
- Task management
- Status tracking

---

### 5️⃣ Chat Module
**Папка**: `app/Modules/Chat/`
**Структура готова для разработки**

**Функции**:
- Real-time messaging
- Conversation management
- Message history
- File sharing in chat

---

### 6️⃣ Notifications Module
**Папка**: `app/Modules/Notifications/`
**Структура готова для разработки**

**Функции**:
- In-app notifications
- Email notifications
- SMS alerts
- Notification preferences

---

### 7️⃣ Admin Module
**Папка**: `app/Modules/Admin/`
**Структура готова для разработки**

**Функции**:
- Admin dashboard
- User management
- System settings
- Audit logs
- Reports

---

## 🎯 BEST PRACTICES ПРИМЕНЕНЫ

✅ **Separation of Concerns**
- Controllers - только HTTP логика
- Services - бизнес-логика
- Repositories - доступ к данным
- Models - работа с БД
- Requests - валидация
- Resources - форматирование ответов

✅ **DI (Dependency Injection)**
- Все зависимости инжектятся в конструктор
- Service Provider регистрирует binding

✅ **No Inline Code**
- Каждый класс - отдельный файл
- Каждая функция - в своем методе
- Стили в отдельных файлах (CSS/SCSS)
- JavaScript логика в отдельных файлах

✅ **Interface Segregation**
- Репозитории используют интерфейсы
- Легко подменять реализацию

✅ **Testability**
- Каждый модуль имеет Tests/ директорию
- Feature и Unit тесты отделены

---

## 🔄 ЖИЗНЕННЫЙ ЦИКЛ ЗАПРОСА

```
HTTP Request
    ↓
Routes/api.php (маршрутизация)
    ↓
Controller (валидация через middleware)
    ↓
Request Class (валидирует input)
    ↓
Service Class (бизнес-логика)
    ↓
Repository (работает с БД)
    ↓
Model (Eloquent ORM)
    ↓
Database
    ↓
Resource (трансформирует ответ)
    ↓
JSON Response
```

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

1. **Завершить Users Module**
   - Создать миграции (users, documents, ibans)
   - Реализовать AuthService (JWT логика)
   - Тесты для auth endpoints

2. **Другие модули**
   - Создать Controllers, Services, Models
   - Определить Routes
   - Написать Requests для валидации

3. **Frontend**
   - Vue 3 компоненты
   - API service layer
   - State management (Pinia)

4. **Testing**
   - Unit tests для Services
   - Feature tests для endpoints
   - Integration tests

---

**Статус**: ✅ Структура готова, Users модуль заполнен примерами
**Дата**: 24 июля 2026
