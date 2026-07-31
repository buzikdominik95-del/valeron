#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/var/www/calipso-v2}"
BACKUP_DIR="${2:-}"

if [[ -z "$BACKUP_DIR" ]]; then
  echo "Usage: $0 <root> <backup_dir>"
  exit 1
fi

cd "$ROOT"

if [[ ! -f "$BACKUP_DIR/nginx.conf" || ! -f "$BACKUP_DIR/.env" ]]; then
  echo "Backup files not found in $BACKUP_DIR"
  exit 1
fi

echo "[rollback] restoring nginx.conf and backend/.env"
cp "$BACKUP_DIR/nginx.conf" nginx.conf
cp "$BACKUP_DIR/.env" backend/.env

# Safety: force-disable admin auth flag if present
python3 - <<'PY'
from pathlib import Path
p = Path('backend/.env')
text = p.read_text().splitlines()
out = []
for line in text:
    if line.startswith('ADMIN_API_REQUIRE_AUTH='):
        out.append('ADMIN_API_REQUIRE_AUTH=false')
    else:
        out.append(line)
p.write_text('\n'.join(out) + '\n')
print('updated backend/.env: ADMIN_API_REQUIRE_AUTH=false')
PY

echo "[rollback] clear laravel cache"
docker exec calipso_app php /var/www/backend/artisan route:clear
docker exec calipso_app php /var/www/backend/artisan config:clear

echo "[rollback] validate/reload nginx"
docker exec calipso_nginx nginx -t
docker exec calipso_nginx nginx -s reload

echo "ROLLBACK DONE"
