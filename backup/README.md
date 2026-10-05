# Backup ke Google Drive — setup sekali (5 menit)

1. Di laptop, install rclone: `brew install rclone` / `sudo apt install rclone`
2. `rclone config` → New remote `gdrive` → pilih Google Drive → ikuti OAuth browser → selesai.
3. Test: `rclone lsd gdrive:` dan `rclone mkdir gdrive:web-kontrakan-backup`
4. Copy config ke server (repo di-clone TIDAK membawa token — `rclone.conf` di-gitignore).
   OAuth tidak perlu diulang, token-nya portabel. Di laptop:
   ```
   scp rclone.conf user@SERVER:/path/web-kontrakan/rclone.conf
   # atau: cat rclone.conf lalu paste manual ke file rclone.conf di server
   ```
   Di server:
   ```
   chmod 600 rclone.conf
   cp .env.example .env   # lalu isi AUTH_SECRET, POSTGRES_PASSWORD, ADMIN_EMAIL
   ```
   Contoh `rclone.conf`:
   ```
   [gdrive]
   type = drive
   scope = drive.file
   token = {"access_token":"...","token_type":"Bearer",...}
   ```
   Alternatif tanpa file: isi `RCLONE_GDRIVE_TOKEN` di `.env` (isi field token di atas).
5. `docker compose up -d --build backup` → cek log `docker compose logs -f backup`
6. Restore drill:
   ```
   rclone copy gdrive:web-kontrakan-backup/kontrakan-YYYYMMDD.dump ./restore.dump
   docker compose exec -T db pg_restore -U kontrakan -d kontrakan --clean < restore.dump
   tar -xzf uploads-YYYYMMDD.tar.gz -C ./data-restore
   ```
