# web-kontrakan — KelolaPro clone privat

Next.js latest + TS + shadcn + Postgres (Docker) + backup mingguan GDrive.
Spec: `PRD.md` (v0.3 locked).

## Jalankan di private server

```bash
cp .env.example .env   # isi AUTH_SECRET, POSTGRES_PASSWORD, OWNER
docker compose up -d --build
docker compose logs -f web
# buka http://server:3000/signup → buat akun internal → login
```

Backup Drive: isi `rclone.conf` (lihat `backup/README.md`), service `backup` jalan tiap Minggu 02:00.

## Dev lokal

```bash
docker compose up -d db
# .env pakai @localhost:5432 untuk dev (compose web tetap pakai @db)
npm install
npx prisma db push
npm run dev
```

## Aturan UX (locked)

- SPA: 1 halaman Tabs + CRUD via Sheet/Dialog/Drawer, bukan pindah route
- Toast (sonner) WAJIB tiap save/action
- Dark mode + mobile-first
- Form: React Hook Form + zod. Fetch: TanStack Query. State ringan: zustand
- Upload: HANYA bukti TF (jpg/png/webp, tolak >2MB, sharp → <500KB) di volume lokal
