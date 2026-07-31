#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/var/www/calipso-v2}"
cd "$ROOT"

echo "[1/8] host/date"
date

echo "[2/8] git head"
git rev-parse --short HEAD

echo "[3/8] key containers"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'calipso_(nginx|app|postgres|redis|queue|scheduler|reverb)'

echo "[4/8] app route syntax"
docker exec calipso_app php -l /var/www/backend/routes/api.php

echo "[5/8] nginx syntax"
docker exec calipso_nginx nginx -t

echo "[6/8] recent upstream errors (main nginx, last 10000)"
docker logs --tail 10000 calipso_nginx 2>&1 | grep -E 'connect\(\) failed|recv\(\) failed|timed out' | tail -n 20 ; true

echo "[7/8] top api endpoints (last 10000)"
docker logs --tail 10000 calipso_nginx 2>&1 | awk '/ \/api\// {print $7}' | sed 's/\?.*$//' | sort | uniq -c | sort -nr | head -n 20

echo "[8/8] db quick counts"
docker exec calipso_postgres psql -U calipso_user -d calipso_db -c "SELECT (SELECT COUNT(*) FROM chats) chats, (SELECT COUNT(*) FROM chat_messages) chat_messages, (SELECT COUNT(*) FROM admin_users) admin_users;"

echo "PRE-FLIGHT OK"
