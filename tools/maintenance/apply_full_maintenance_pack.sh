#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/var/www/calipso-v2}"
CANONICAL_DOMAIN="${2:-velorafinanza.com}"
LEGACY_DOMAINS_CSV="${3:-it-velora.com,www.it-velora.com}"

cd "$ROOT"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/progress/window_backups/$STAMP"
mkdir -p "$BACKUP_DIR"

echo "[backup] $BACKUP_DIR"
cp nginx.conf "$BACKUP_DIR/nginx.conf"
cp backend/.env "$BACKUP_DIR/.env"
cp backend/routes/api.php "$BACKUP_DIR/api.php"

python3 - <<PY
from pathlib import Path

canonical = "${CANONICAL_DOMAIN}".strip()
legacy = [x.strip() for x in "${LEGACY_DOMAINS_CSV}".split(',') if x.strip()]
env_path = Path("backend/.env")
text = env_path.read_text()

updates = {
    "ADMIN_API_REQUIRE_AUTH": "true",
    "CANONICAL_CLIENT_DOMAIN": canonical,
    "LEGACY_CLIENT_DOMAINS": ",".join(legacy),
    "APP_URL": f"https://{canonical}",
}

lines = text.splitlines()
for key, value in updates.items():
    prefix = key + "="
    for i, line in enumerate(lines):
        if line.startswith(prefix):
            lines[i] = f"{key}={value}"
            break
    else:
        lines.append(f"{key}={value}")

# SANCTUM_STATEFUL_DOMAINS: remove legacy domains, keep canonical + www + monitoring
stateful_key = "SANCTUM_STATEFUL_DOMAINS="
for i, line in enumerate(lines):
    if line.startswith(stateful_key):
        raw = line[len(stateful_key):]
        values = [v.strip() for v in raw.split(',') if v.strip()]
        filtered = [v for v in values if v not in legacy]
        must_have = [canonical, f"www.{canonical}", f"monitoring.{canonical}"]
        for host in must_have:
            if host not in filtered:
                filtered.append(host)
        lines[i] = stateful_key + ",".join(filtered)
        break

env_path.write_text("\n".join(lines) + "\n")
print("updated backend/.env")
PY

python3 - <<PY
from pathlib import Path

canonical = "${CANONICAL_DOMAIN}".strip()
path = Path("nginx.conf")
text = path.read_text()
needle = "# ===== VELORA HTTPS ====="
if needle not in text:
    raise SystemExit("VELORA HTTPS block not found")

redirect_line = f"        return 301 https://{canonical}\$request_uri;"
if redirect_line in text:
    print("nginx canonical redirect already present")
else:
    block_start = text.index(needle)
    # limit to this server block area
    segment = text[block_start:]
    insert_after = "        ssl_session_timeout 10m;\n"
    idx = segment.find(insert_after)
    if idx == -1:
        raise SystemExit("ssl_session_timeout marker not found in legacy https block")
    idx += len(insert_after)
    segment = segment[:idx] + "\n" + redirect_line + "\n" + segment[idx:]
    text = text[:block_start] + segment
    path.write_text(text)
    print("updated nginx.conf")
PY

echo "[apply] clear laravel cache"
docker exec calipso_app php /var/www/backend/artisan route:clear
docker exec calipso_app php /var/www/backend/artisan config:clear

echo "[apply] run targeted migration (hot-path indexes)"
docker exec calipso_app php /var/www/backend/artisan migrate --path=database/migrations/2026_07_31_121500_add_hot_path_indexes_for_chat_and_tokens.php --force

echo "[apply] validate/reload nginx"
docker exec calipso_nginx nginx -t
docker exec calipso_nginx nginx -s reload

echo "DONE. Backup dir: $BACKUP_DIR"
