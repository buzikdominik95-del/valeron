# AI Orchestrator Fallback (Main Server)

Легкий fallback-контур ai_orchestrator на Main Server без переноса LLM.

Что делает:
- Поднимает контейнер ai_orchestrator_fallback на Main.
- Использует удаленные сервисы AI Server:
  - Postgres 141.101.132.206:15433
  - Redis 141.101.132.206:16379
  - Qdrant 141.101.132.206:16333
  - LLM API 141.101.132.206:18001/v1
- Порт на Main: 127.0.0.1:18081.

Запуск:
cd /home/usergpu/valerprod/ops/ai-fallback-orchestrator
docker compose up -d

Проверка:
curl -s http://127.0.0.1:18081/health

Важно:
Это fallback-слой orchestrator. LLM остается на AI Server.
