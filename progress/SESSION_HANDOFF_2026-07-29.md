# SESSION HANDOFF — 2026-07-29

## Текущее состояние
- branch: main
- head: 73ad272 (merge develop auth API)
- origin/develop: d785b5f (already merged)

## Ключевые фиксы по переключению уровней
- backend route: POST /api/admin/commission/advance
- controller: backend/app/Http/Controllers/Api/AdminCommissionController.php
- fix: applyAdminLevel no longer returns early in API mode (a832286)
- fix: send email + fallback to localStorage velora:email
- fix: offline fallback on API error
- UI: level switcher forced visible in cabinet

## Текущие runtime настройки фронта
- VITE_USE_API=true
- VITE_API_ORIGIN=https://it-velora.com
- VITE_API_BASE=/api
- VITE_SHOW_PHASE_BAR=1

## Быстрый старт новой сессии (2-3 минуты)
1) Hard reload кабинета (Ctrl+F5)
2) Нажать L1/L2/L3/L4
3) Проверить nginx логи на POST /api/admin/commission/advance
4) Если 404 User not found -> проверить email в body запроса

## Быстрые команды
docker logs calipso_nginx --since 30m 2>&1 | grep "api/admin/commission/advance" | tail -50
docker exec calipso_app php artisan route:list | grep "admin/commission/advance"
curl -sS -X POST https://it-velora.com/api/admin/commission/advance -H "Content-Type: application/json" -d "{""level"":2,""email"":""test@example.com""}" -i

## Файлы для правок в первую очередь
- frontend/src/composables/useCommission.ts
- frontend/src/stores/dossier.store.ts
- frontend/src/features/account/VelAccountFlow.vue
- backend/app/Http/Controllers/Api/AdminCommissionController.php
- backend/routes/api.php
