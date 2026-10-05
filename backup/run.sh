#!/bin/sh
# Backup mingguan: pg_dump + uploads tar.gz -> rclone ke Google Drive (PRD §10.1)
set -e
apk add --no-cache postgresql16-client rclone dcron tzdata 2>/dev/null || apk add --no-cache postgresql-client rclone dcron tzdata

BACKUP_DIR="/tmp/backup"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M)"
DUMP="$BACKUP_DIR/kontrakan-$STAMP.dump"
UPLOADS_TGZ="$BACKUP_DIR/uploads-$STAMP.tar.gz"

echo "[backup] cron: $BACKUP_CRON | retention: ${BACKUP_RETENTION_DAYS}d | dest: gdrive:$GDRIVE_FOLDER"

cat > /tmp/do-backup.sh <<'EOS'
#!/bin/sh
set -e
BACKUP_DIR="/tmp/backup"
STAMP="$(date +%Y%m%d-%H%M)"
DUMP="$BACKUP_DIR/kontrakan-$STAMP.dump"
UPLOADS_TGZ="$BACKUP_DIR/uploads-$STAMP.tar.gz"
echo "[backup] pg_dump..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -Fc -h db -U kontrakan kontrakan > "$DUMP"
echo "[backup] tar uploads..."
tar -czf "$UPLOADS_TGZ" -C / uploads 2>/dev/null || echo "[backup] uploads kosong, skip tar isi"
echo "[backup] rclone copy..."
if [ -z "$RCLONE_GDRIVE_TOKEN" ] && [ ! -f /root/.config/rclone/rclone.conf ]; then
  echo "[backup] SKIP upload: RCLONE_GDRIVE_TOKEN/rclone.conf belum diisi. File tersimpan lokal di $BACKUP_DIR"
  ls -lh "$BACKUP_DIR"
  exit 0
fi
rclone copy "$DUMP" "gdrive:$GDRIVE_FOLDER/" --progress=false
rclone copy "$UPLOADS_TGZ" "gdrive:$GDRIVE_FOLDER/" --progress=false || true
echo "[backup] bersihkan lokal >7 hari..."
find "$BACKUP_DIR" -type f -mtime +7 -delete || true
echo "[backup] bersihkan Drive >${BACKUP_RETENTION_DAYS}d..."
rclone delete "gdrive:$GDRIVE_FOLDER/" --min-age "${BACKUP_RETENTION_DAYS}d" || true
date -u +%FT%TZ > "$BACKUP_DIR/BACKUP_LAST_OK"
echo "[backup] OK $STAMP"
EOS
chmod +x /tmp/do-backup.sh

# jalan sekali saat start (biar langsung ketahuan error), lalu via cron
/tmp/do-backup.sh || echo "[backup] initial run gagal (wajar jika token kosong), lanjut cron..."

echo "$BACKUP_CRON /tmp/do-backup.sh >> /var/log/backup.log 2>&1" | crontab -
crond -f -l 2
