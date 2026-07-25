# Velora CRM - CI/CD Documentation

## Процесс разработки

### Структура веток
- `develop` - тестовый сервер (dev.it-velora.com)
- `main` - боевой сервер (it-velora.com)

### Workflow разработки

1. **Разработка**
   ```bash
   # В VS Code
   - Вносите изменения в код
   - Git: Commit (Ctrl+Shift+G)
   - Git: Push
   ```

2. **Автодеплой на тестовый сервер**
   - Push в `develop` → автоматический деплой
   - Проверяете на dev.it-velora.com
   - Если всё ОК → переходите к шагу 3

3. **Деплой на продакшен**
   ```bash
   # В GitHub Desktop или VS Code
   - Создайте Pull Request: develop → main
   - Merge PR
   - Автоматический деплой на it-velora.com
   ```

### Автоматические действия при деплое

**Develop сервер:**
- ✅ Git pull
- ✅ Composer install
- ✅ Миграции БД
- ✅ Очистка кеша
- ✅ npm install + build
- ✅ Перезапуск сервисов

**Production сервер:**
- ✅ Git pull
- ✅ Composer install (production)
- ✅ Миграции БД
- ✅ Кеширование конфигов/роутов/view
- ✅ npm install + build
- ✅ Перезапуск сервисов

### Откат к предыдущей версии

Если что-то сломалось на продакшене:

```bash
# На сервере
cd /var/www/calipso-v2
git log --oneline  # Найдите хороший коммит
git reset --hard COMMIT_HASH
docker-compose restart app nginx
```

Или через GitHub:
- Repository → Actions → найдите успешный деплой
- Re-run workflow

## Настройка (уже готово)

- ✅ GitHub репозиторий
- ⏳ GitHub Secrets (SSH ключи)
- ⏳ Тестовый сервер
- ✅ Боевой сервер

## Что дальше?

1. Создать SSH ключ для GitHub Actions
2. Добавить в GitHub Secrets
3. Настроить тестовый сервер (опционально - можно тестить на продакшене)
4. Сделать первый коммит через VS Code
