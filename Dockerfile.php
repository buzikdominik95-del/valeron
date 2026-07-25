FROM php:8.4-fpm

RUN apt-get update ; apt-get install -y \
    postgresql-client \
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

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

RUN useradd -m -u 1000 www ; \
    mkdir -p /var/www/backend ; \
    chown -R www:www /var/www/backend

WORKDIR /var/www/backend
USER www

CMD ["php-fpm"]
