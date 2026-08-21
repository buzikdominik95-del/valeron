# AI Orchestrator Fallback (Main Server)

Лёгкий fallback-контур  на Main Server без переноса LLM.

## Что делает
- Поднимает контейнер  на Main.
- Использует удалённые сервисы AI Server:
  - Postgres 
  - Redis 
  - Qdrant 
  - LLM API 
- Порт на Main: .

## Запуск
[main c81cf9d] feat(ai): add main-server fallback orchestrator compose (no llm migration)
 2 files changed, 43 insertions(+)
 create mode 100644 ops/ai-fallback-orchestrator/README.md
 create mode 100644 ops/ai-fallback-orchestrator/docker-compose.yml
c81cf9d feat(ai): add main-server fallback orchestrator compose (no llm migration)
2cd4b4d chore(ops): route localhost API to laravel and add tech-check endpoint
fddef77 fix(ai-manager): add proxy retries and strict local settings validation
fe56f59 merge: release develop into main (admin fixes, iOS mobile, mail, CPI certificate)
total 16
drwxr-xr-x 2 root root 4096 Aug 21 15:33 .
drwxr-xr-x 3 root root 4096 Aug 21 15:33 ..
-rw-r--r-- 1 root root  719 Aug 21 15:33 README.md
-rw-r--r-- 1 root root  852 Aug 21 15:33 docker-compose.yml
OK_MAIN
s311324.love-is.nexus
/root
alive
usergpu
Fri Aug 21 03:34:01 PM UTC 2026
hi_from_terminal

## Проверка
MAIN_OK
s311324.love-is.nexus
RECOVERED_EXEC
usergpu
/home/usergpu/AI_SUPPORT/ai_platform/orchestrator

## Важно
Это fallback-слой orchestrator. LLM остаётся на AI Server.
