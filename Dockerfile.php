FROM php:8.4-fpm

RUN apt-get update ; apt-get install -y \
    postgresql-client \
    poppler-utils \
    libpq-dev \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libzip-dev \
    libicu-dev \
    autoconf \
    build-essential ; \
    rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-jpeg=/usr/include --with-webp ; \
    docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pdo_mysql \
    gd \
    zip \
    intl \
    bcmath \
    opcache \
    pcntl \
    sockets

RUN pecl install redis ; docker-php-ext-enable redis

# Production-safe PHP-FPM pool tuning (persistent on next rebuild)
RUN set -eux; \
    sed -ri "s/^pm\.max_children\s*=.*/pm.max_children = 20/" /usr/local/etc/php-fpm.d/www.conf; \
    sed -ri "s/^pm\.start_servers\s*=.*/pm.start_servers = 6/" /usr/local/etc/php-fpm.d/www.conf; \
    sed -ri "s/^pm\.min_spare_servers\s*=.*/pm.min_spare_servers = 4/" /usr/local/etc/php-fpm.d/www.conf; \
    sed -ri "s/^pm\.max_spare_servers\s*=.*/pm.max_spare_servers = 10/" /usr/local/etc/php-fpm.d/www.conf; \
    if grep -q "^pm.max_requests\s*=" /usr/local/etc/php-fpm.d/www.conf; then \
      sed -ri "s/^pm\.max_requests\s*=.*/pm.max_requests = 500/" /usr/local/etc/php-fpm.d/www.conf; \
    else \
      echo "pm.max_requests = 500" >> /usr/local/etc/php-fpm.d/www.conf; \
    fi

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

RUN useradd -m -u 1000 www ; \
    mkdir -p /var/www/backend ; \
    chown -R www:www /var/www/backend

WORKDIR /var/www/backend
USER www

CMD ["php-fpm"]
