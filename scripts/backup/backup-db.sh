#!/bin/bash
# Дамп PostgreSQL на бэкап-сервер (каждые 6ч), хранить 4 свежих
set -o pipefail
BK_HOST="root@193.221.200.34"
BK_KEY="/home/usergpu/.ssh/id_ed25519_backup"
BK_DIR="/backups/valerprod/db"
TS=$(date +%Y%m%d-%H%M%S)
LOG="/home/usergpu/backup-scripts/backup-db.log"
SSH="ssh -i $BK_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

echo "[$(date '+%F %T')] START db backup $TS" >> "$LOG"

if ! $SSH $BK_HOST "mkdir -p $BK_DIR"; then
  echo "[$(date '+%F %T')] FAIL mkdir" >> "$LOG"
  exit 1
fi

docker exec calipso_postgres pg_dump -U calipso_user -d calipso_db --format=custom --compress=6 2>>"$LOG" | $SSH $BK_HOST "cat > $BK_DIR/calipso_db-$TS.dump.part; mv $BK_DIR/calipso_db-$TS.dump.part $BK_DIR/calipso_db-$TS.dump"

if [ ${PIPESTATUS[0]} -ne 0 ] || [ ${PIPESTATUS[1]} -ne 0 ]; then
  echo "[$(date '+%F %T')] FAIL dump/upload" >> "$LOG"
  exit 1
fi

# Ротация: оставляем 4 самых свежих
$SSH $BK_HOST "cd $BK_DIR; ls -1t calipso_db-*.dump 2>/dev/null | tail -n +5 | xargs -r rm -f"

SIZE=$($SSH $BK_HOST "du -h $BK_DIR/calipso_db-$TS.dump | cut -f1")
echo "[$(date '+%F %T')] OK db backup $TS size=$SIZE" >> "$LOG"
