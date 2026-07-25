#!/bin/bash
set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка ОС
if [[ ! -f /etc/os-release ]]; then
    print_error "Система не поддерживается. Требуется Ubuntu/Debian."
fi

. /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    print_error "Система не поддерживается. Требуется Ubuntu/Debian."
fi

print_info "=== Развертывание инфраструктуры Calipso v2 ==="

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   print_error "Скрипт должен запускаться с правами root"
fi

# Шаг 1: Проверка ресурсов
print_info "Проверка системных ресурсов..."
RAM_GB=$(grep MemTotal /proc/meminfo | awk '{print $2 / 1024 / 1024}')
if (( $(echo "$RAM_GB < 2" | bc -l) )); then
    print_warning "Рекомендуется минимум 2GB RAM (текущий: ${RAM_GB}GB)"
fi

# Шаг 2: Обновление пакетов
print_info "Обновление пакетов системы..."
apt-get update -qq
apt-get upgrade -y -qq

# Шаг 3: Установка Docker
print_info "Установка Docker..."
if ! command -v docker &> /dev/null; then
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    print_info "Docker установлен успешно"
else
    print_info "Docker уже установлен"
fi

# Шаг 4: Установка Docker Compose
print_info "Установка Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y -qq docker-compose
    print_info "Docker Compose установлен"
else
    print_info "Docker Compose уже установлен"
fi

# Шаг 5: Создание структуры директорий
print_info "Создание структуры директорий..."
mkdir -p /var/www/calipso-v2/{backend,frontend,certbot/conf,certbot/www}
cd /var/www/calipso-v2

# Шаг 6: Генерация переменных окружения
print_info "Генерация файла .env..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 32)
APP_KEY=$(openssl rand -base64 32)

cat > /var/www/calipso-v2/.env << EOF
APP_NAME=Calipso
APP_ENV=production
APP_DEBUG=false
APP_URL=https://calipso-it.com
APP_KEY=base64:$APP_KEY

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=calipso_db
DB_USERNAME=calipso_user
DB_PASSWORD=$DB_PASSWORD

REDIS_HOST=redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_PORT=6379

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256

BROADCAST_DRIVER=reverb
REVERB_HOST=0.0.0.0
REVERB_PORT=8080
REVERB_SCHEME=https
REVERB_APP_ID=calipso
REVERB_APP_KEY=$APP_KEY
REVERB_APP_SECRET=$JWT_SECRET

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS=noreply@calipso-it.com
MAIL_FROM_NAME=Calipso

LOG_CHANNEL=stack
LOG_LEVEL=debug

FILESYSTEMS_DISKS_LOCAL_DRIVER=local
FILESYSTEMS_DISKS_LOCAL_ROOT=storage/app
FILESYSTEMS_DISKS_LOCAL_URL=/storage

SANCTUM_STATEFUL_DOMAINS=calipso-it.com,www.calipso-it.com
SESSION_DOMAIN=.calipso-it.com
CORS_ALLOWED_ORIGINS=https://calipso-it.com,https://www.calipso-it.com
EOF

print_info "Переменные окружения сохранены"

# Шаг 7: Копирование конфигов Docker
print_info "Копирование конфигурационных файлов..."
# Здесь должны быть скопированы docker-compose.yml, Dockerfile.php, nginx.conf, php.ini, init.sql
# В реальном сценарии они загружены через SCP/SFTP

# Шаг 8: Инициализация Laravel
print_info "Инициализация Laravel 11..."
cd /var/www/calipso-v2/backend

# Построение образов
print_info "Построение Docker образов..."
cd /var/www/calipso-v2
docker-compose build

# Запуск контейнеров
print_info "Запуск контейнеров..."
docker-compose up -d

# Ожидание готовности БД
print_info "Ожидание готовности PostgreSQL..."
sleep 10

# Установка Laravel зависимостей
print_info "Установка зависимостей Laravel..."
docker-compose exec -T app composer install --no-interaction --prefer-dist

# Генерация ключа приложения
print_info "Генерация ключей приложения..."
docker-compose exec -T app php artisan key:generate
docker-compose exec -T app php artisan migrate:fresh --seed --force

# Шаг 9: Настройка прав доступа
print_info "Настройка прав доступа..."
docker-compose exec -T app php artisan storage:link
docker-compose exec -T app chmod -R 775 storage bootstrap/cache

# Шаг 10: Сохранение учетных данных
print_info "Сохранение учетных данных..."
cat > /root/.calipso_credentials << EOF
=== Учетные данные Calipso v2 ===
Дата развертывания: $(date)

PostgreSQL:
  Host: postgres (docker network) / localhost (внешний)
  Port: 5432
  Database: calipso_db
  Username: calipso_user
  Password: $DB_PASSWORD

Redis:
  Host: redis (docker network) / localhost (внешний)
  Port: 6379
  Password: $REDIS_PASSWORD

Laravel:
  APP_URL: https://calipso-it.com
  JWT_SECRET: $JWT_SECRET
  APP_KEY: base64:$APP_KEY

Docker Compose:
  Location: /var/www/calipso-v2
  Status: docker-compose ps
  Logs: docker-compose logs -f

Следующие шаги:
1. Настроить DNS: calipso-it.com → $(hostname -I | awk '{print $1}')
2. Установить SSL: certbot --nginx -d calipso-it.com -d www.calipso-it.com
3. Запустить очереди: docker-compose exec -T app php artisan queue:work
4. Перейти на http://$(hostname -I | awk '{print $1}')
EOF

chmod 600 /root/.calipso_credentials

print_info "=== Развертывание завершено успешно ==="
print_info "Учетные данные сохранены в /root/.calipso_credentials"
echo ""
echo "Выполняемые контейнеры:"
docker-compose ps
echo ""
echo "Проверка здоровья приложения:"
sleep 5
docker-compose exec -T app php artisan tinker --execute "echo 'App is running!';"

print_info "Для просмотра логов используйте: docker-compose logs -f"
