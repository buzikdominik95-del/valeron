#!/bin/bash
# Полная выгрузка сборки проекта на бэкап-сервер (каждые 12ч), хранить 3 свежих
set -o pipefail
BK_HOST="root@193.221.200.34"
BK_KEY="/home/usergpu/.ssh/id_ed25519_backup"
BK_DIR="/backups/valerprod/project"
TS=$(date +%Y%m%d-%H%M%S)
LOG="/home/usergpu/backup-scripts/backup-project.log"
SSH="ssh -i $BK_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

echo "[$(date '+%F %T')] START project backup $TS" >> "$LOG"

if ! $SSH $BK_HOST "mkdir -p $BK_DIR"; then
  echo "[$(date '+%F %T')] FAIL mkdir" >> "$LOG"
  exit 1
fi

tar -czf - -C /home/usergpu \
  --exclude='valerprod/frontend/node_modules' \
  --exclude='valerprod/backend/node_modules' \
  --exclude='valerprod/frontend/dist.stale*' \
  --exclude='valerprod/uptime-kuma' \
  --exclude='valerprod/backend/storage/logs/*' \
  valerprod 2>/dev/null | $SSH $BK_HOST "cat > $BK_DIR/valerprod-$TS.tar.gz.part; mv $BK_DIR/valerprod-$TS.tar.gz.part $BK_DIR/valerprod-$TS.tar.gz"

if [ ${PIPESTATUS[1]} -ne 0 ]; then
  echo "[$(date '+%F %T')] FAIL upload" >> "$LOG"
  exit 1
fi

# Ротация: оставляем 3 самых свежих
$SSH $BK_HOST "cd $BK_DIR; ls -1t valerprod-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f"

SIZE=$($SSH $BK_HOST "du -h $BK_DIR/valerprod-$TS.tar.gz | cut -f1")
echo "[$(date '+%F %T')] OK project backup $TS size=$SIZE" >> "$LOG"
