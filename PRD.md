# PRD — web-kontrakan (KelolaPro Clone Privat)

**Versi:** 0.4 — 6 Oct 2026 (cicilan/partial + bayar multi-periode + invoice gabungan; sebelumnya 0.3 locked 5 Oct 2026)
**Pemilik:** pribadi (single owner, private server Docker)
**Referensi:** kelolapro.com — Aplikasi Manajemen Kost
**Repo/folder:** `/web-kontrakan`
**Tujuan:** ganti catatan manual/Excel dengan web app sendiri untuk manage penghuni kontrakan + monitor pembayaran bulanan.

> **Traceability 7 masukan kakak → spec:**
> 1. No. telp yg ngontrak → `Tenant.phoneWa` **wajib**, validasi 08xx→62xx (§4.3)
> 2. Nama yg ngontrak → `Tenant.name` **wajib** (§4.3)
> 3. Tanggal jatuh tempo → `Bill.dueDate` **wajib** per tagihan + default hari jatuh tempo (§4.5)
> 4. Harga kontrakan → `Unit.monthlyPrice` + snapshot `Bill.amount` (§4.2, §4.5)
> 5. Alarm/reminder jatuh tempo → Dashboard alarm visual + badge overdue/H-7 (§4.9, §4.5)
> 6. Input pembayaran cash/trf → `Payment.method: CASH|TRANSFER` + bukti opsional (§4.6)
> 7. Invoice atas pembayaran → Invoice/Kuitansi PDF per pembayaran lunas (§4.7)

---

## 1. Latar & Masalah

Pemilik punya unit kontrakan (bukan kost besar) dan butuh:
1. Data penghuni rapi (siapa, di unit mana, sejak kapan, kontak WA, KTP).
2. Tagihan bulanan terpantau (siapa sudah bayar / belum / telat berapa hari).
3. Bukti bayar tersimpan (foto transfer, kuitansi PDF kalau dibutuhkan).
4. Kas sederhana ( Pemasukan sewa vs pengeluaran servis/benerin ).
5. Ingatkan penghuni via WA dengan 1 klik (tanpa gateway berbayar).

Solusi saat ini (Excel/WA manual) tidak scalable: riwayat tercecer, status bayar tidak real-time, tidak ada dashboard tunggakan.

## 2. Tujuan Produk (Success Criteria)

MVP dianggap sukses jika owner bisa, dari HP/laptop via browser ke private server:
- [ ] Lihat dashboard: total unit, terisi, kosong, pemasukan bulan ini, tunggakan aktif.
- [ ] CRUD kontrakan/properti + unit/pintu/kamar.
- [ ] CRUD penghuni + tempatkan ke unit (1 penghuni aktif per unit).
- [ ] Generate tagihan bulanan massal dalam <30 detik untuk semua unit terisi.
- [ ] Tandai lunas + upload bukti + cetak/unduh kuitansi PDF.
- [ ] Kirim pengingat via template WA (tombol `wa.me` + teks terisi otomatis).
- [ ] Catat pengeluaran + lihat laporan kas bulanan.
- [ ] Jalan stabil di Docker private server (1x `docker compose up`).

Non-goal MVP: multi-user/roles, QRIS otomatis, gateway WA otomatis, mobile app, marketplace katalog.

## 3. Pengguna & Asumsi

- **Satu user saja (owner).** Login email+password sederhana, session cookie. Tidak ada roles di MVP.
- **Skala:** <10 properti, <100 unit, <500 tagihan/tahun. Optimasi tidak kritis.
- **Akses:** private server (LAN / VPS + Tailscale / VPN). Tidak expose publik wajib, tidak butuh SEO.
- **Bahasa:** Indonesia. Mata uang: IDR. Zona waktu: Asia/Jakarta.
- **Perangkat:** mobile-first (buka dari HP), tapi layout responsive desktop.

## 4. Scope MVP (Full Clone Inti, disederhanakan)

### 4.1 Properti (Kontrakan)
- CRUD: nama (cth. "Kontrakan Obos 102"), alamat, catatan.
- List + hitung unit, okupansi per properti.
- Hapus protektif (tidak bisa hapus jika masih ada unit aktif).

### 4.2 Unit / Pintu / Kamar
- CRUD per properti: kode/nomor (A1, B2), harga sewa/bulan default, status (terisi/kosong/rusak), catatan.
- 1 penghuni aktif per unit dalam satu waktu (ditegakkan di DB + UI).
- Ganti penghuni = penghuni lama di-checkout-kan, riwayat tersimpan.

### 4.3 Penghuni (Tenant) — [Req kakak #1, #2]
- CRUD: **nama wajib** (req #2), **no. telp/WA wajib** (req #1, format 08xx auto-normalisasi ke 62xx, validasi min 9 digit).
- Field lain: KTP/NIK opsional, kontak darurat, tanggal masuk, catatan.
- Dokumen: foto KTP (upload, opsional MVP).
- Status: aktif (terikat unit) / nonaktif (riwayat).
- Riwayat huni: unit mana, periode, ditampilkan di detail penghuni.
- List penghuni tampilkan kolom: nama + no.telp (klik → wa.me), unit, jatuh tempo berikutnya, status bayar bulan ini.

### 4.4 Sewa / Kontrak (Lease) — disederhanakan
MVP tidak perlu kontrak kompleks. Cukup relasi:
`penghuni aktif -> unit -> harga saat itu + tgl masuk + tgl keluar (nullable) + deposit opsional`.
- Checkout menghentikan generate tagihan berikutnya untuk pasangan itu.
- Ganti harga sewa per unit tidak merusak tagihan lama (tagihan simpan snapshot `amount`).

### 4.5 Tagihan (Billing) — inti [Req kakak #3, #4, #5]
- Periode bulanan: `YYYY-MM`.
- **Tanggal jatuh tempo wajib** (req #3): input saat generate massal (default tgl 5, bisa diubah per tagihan). Tersimpan `Bill.dueDate` (date, bukan cuma hari).
- **Harga kontrakan** (req #4): default `amount` = `Unit.monthlyPrice` saat generate, bisa edit manual per tagihan (diskon/denda/kenaikan). Snapshot, tidak berubah jika harga unit berubah.
- Generate massal: pilih properti + periode + jatuh tempo → buat 1 tagihan per unit TERISI yang belum punya tagihan di periode itu (idempotent, anti-duplikat).
- Tagihan fields: unit, penghuni snapshot (nama+telp), periode, jumlah, jatuh tempo, status (`unpaid | paid | overdue` otomatis dari tanggal), catatan.
- Aksi: edit jumlah/jatuh tempo, hapus draft salah, tandai lunas, kirim WA.
- List dengan filter: properti, periode, status. **Badge: merah OVERDUE H+N, kuning JATUH TEMPO ≤7 hari, hijau LUNAS, abu BELUM BAYAR.**
- Detail tagihan: info penghuni/unit, timeline bayar.

### 4.6 Pembayaran (Manual + Bukti + Cicilan) — [Req kakak #6] (v0.4: multi-payment)
- Form bayar: tanggal bayar (default hari ini), nominal (default = sisa tagihan), **metode wajib: CASH | TRANSFER** (req #6, radio button sederhana), catatan, upload bukti.
- Bukti: **hanya untuk TRANSFER (wajib 1 gambar). CASH = tanpa upload.** Validasi jpg/png/webp, tolak >2MB, auto-kompres <500KB (lihat §10.2).
- **1 tagihan boleh banyak pembayaran (cicilan/nyicil):** nominal custom 1..sisa, tolak > sisa (TF selalu pas). Status `paid` jika total >= tagihan, `partial`/`Nyicil` jika sebagian. Badge + filter "Nyicil/sebagian".
- **Bayar multi-periode sekaligus (cth. Sept+Okt+Nov):** checkbox di tab Tagihan → 1 dialog bulk (nominal per bulan default sisa, bisa diubah) → 1 pembayaran per bulan, 1 file bukti dipakai bersama bila TRANSFER. Validasi: semua tagihan 1 penghuni yg sama.
- Void per baris pembayaran (riwayat di kartu tagihan). File bukti dihapus hanya jika tak dipakai pembayaran lain.
- Upload tersimpan di volume Docker lokal `/app/data/uploads`, diserve via Next.js, bukan di DB.

### 4.7 Invoice / Kuitansi PDF — [Req kakak #7] (v0.4: invoice gabungan)
- Tombol unduh/cetak **Invoice** per tagihan yg ada pembayaran (lunas maupun nyicil; tanpa pembayaran = 404 cegah invoice palsu).
- **Invoice gabungan** `/tagihan/invoice?ids=...`: 1 kuitansi utk bayar banyak periode (baris Sept, Okt, Nov ke bawah + TOTAL TAGIHAN / TOTAL DIBAYAR / SISA). No. `INV/GAB/YYYYMM/XXX`.
- Stempel LUNAS hanya bila semua lunas; cicilan tampil status sisa per baris (tanpa stempel).
- Isi wajib: no. invoice (`INV/YYYYMM/XXX`), nama penghuni + telp, unit/properti, periode sewa, tanggal jatuh tempo, harga, tgl bayar, metode (CASH/TRANSFER), nominal + terbilang, nama owner.
- Implementasi MVP: halaman print-friendly `/tagihan/[id]/invoice` + tombol Cetak/Save PDF browser (nol dependensi berat). `react-pdf` = Phase 2 bila butuh file PDF biner.
- Invoice hanya bisa dicetak untuk tagihan `paid` (cegah invoice palsu).

### 4.8 Kas & Pengeluaran
- Pemasukan = otomatis dari pembayaran tagihan (tidak input ganda).
- Pengeluaran manual: tanggal, kategori (servis, listrik bersama, air, pajak, lain), nominal, catatan, bukti opsional.
- Laporan bulanan: total masuk, total keluar, saldo, tabel per transaksi, filter bulan + properti.
- Export CSV (1 klik). Export Excel = Phase 2.

### 4.9 Dashboard & Monitoring — Alarm Jatuh Tempo [Req kakak #5]
- **Alarm MVP = visual, tanpa push (cukup untuk private server):**
  - Banner merah di atas dashboard jika ada `N tagihan OVERDUE Rp...` (klik → filter list overdue).
  - Badge kuning untuk jatuh tempo ≤7 hari (H-7 s/d H-0).
  - Sort default tagihan: overdue paling lama di atas.
- Kartu: total unit, terisi %, kosong, pemasukan bulan berjalan, tunggakan (count + nominal).
- Daftar: tunggakan teratas (overdue), jatuh tempo ≤7 hari, unit kosong.
- Pemasukan 6-12 bulan terakhir (bar chart sederhana, tanpa lib berat).
- Phase 2 (bukan MVP): pengingat otomatis terjadwal (cron + WA gateway / email) + notif browser.

### 4.10 WhatsApp Template Manual (tanpa gateway)
- Tombol per tagihan + broadcast per properti/periode:
  - `Tagih`: "Yth Bpk/Ibu X, tagihan kontrakan [unit] periode [MMM YYYY] Rp... jatuh tempo tgl... - [nama owner]"
  - `Pengingat telat`: sama + "sudah telat N hari".
  - `Konfirmasi lunas`: "Terima kasih, pembayaran ... sudah diterima."
- Implementasi: `https://wa.me/62xxx?text=<encodeURIComponent>` dibuka di tab baru. Copy template juga tersedia.
- Nomor WA dinormalisasi saat input (08xx → 62xx).

### 4.11 Auth & Keamanan (privat) — LOCKED
- Email + password saja (internal). **Hanya `ADMIN_EMAIL` (agusprnyt@gmail.com) yang boleh signup** — email lain 403.
- Auth.js credentials + bcrypt. Middleware proteksi semua route kecuali `/login`, `/signup`, `/api/health`.
- Migrasi via `prisma migrate` otomatis saat container web start.

## 5. Di Luar Scope MVP (Phase 2)

- Multi-user/roles (owner + pengelola), multi-tenant SaaS, billing subscription.
- WA gateway otomatis terjadwal (Fonnte/Wablas), email invoice.
- Payment gateway QRIS/Midtrans/Xendit + webhook.
- Cicilan/parsial, deposit management, denda otomatis, kontrak digital TTD.
- Katalog publik kost, SEO/landing page.
- PWA push notif, mobile app native.

## 6. Tech Stack (wajib)

- **Frontend+Backend:** Next.js latest stable saat scaffold (App Router), TypeScript latest, Tailwind + shadcn/ui latest.
- **DB LOCKED:** PostgreSQL 16 + Prisma + migrations. Backup mingguan ke Google Drive via service `backup` (rclone) — lihat §10.1.
- **Auth:** email + password saja (internal). Auth.js (NextAuth v5) credentials + tabel User sendiri. Signup terbuka internal (tanpa OAuth/roles di MVP).
- **Form & data:** React Hook Form + zod (semua form), TanStack Query untuk fetch/mutasi client, zustand hanya bila perlu state global ringan (filter, sheet open, theme tambahan).
- **UI/UX LOCKED:**
  - Minim pindah halaman → pola SPA: 1 shell dashboard + Tabs + CRUD via `Sheet`/`Dialog`/`Drawer` shadcn (bukan route baru).
  - `Toaster` (sonner shadcn) WAJIB tiap save/action sukses/gagal — tanpa exception.
  - Dark mode via `next-themes` + Theme switcher di header. Semua komponen harus lolos light+dark.
  - Mobile-first responsive: bottom nav / drawer di HP, tabel → cards di layar kecil.
- **Validasi:** zod di client (RHF resolver) + server. Format IDR + tanggal: `date-fns`.
- **PDF:** print-CSS dulu (nol dep), `react-pdf` opsional Phase 2.
- **Upload:** local volume di `UPLOAD_DIR=/app/data/uploads` (disserve via route `/api/files/...`, BUKAN `public/` — lihat §10.2). Validasi tipe/size, nama file UUID + sharp kompres.
- **Infra:** Docker + Docker Compose. 2 service: `web` (Next standalone) + `db` (postgres:16-alpine + volume). ENV via `.env`. Healthcheck DB. Backup via `pg_dump` cron/manual.
- **Kualitas:** ESLint + Prettier, `pnpm`, git. E2E manual checklist dulu (Playwright Phase 2).

Arsitektur:

```
Browser (HP/Laptop) -> [ Next.js web:3000 (SSR + API Routes / Server Actions) ]
                        -> [ Postgres:5432 ]
                        -> [ /uploads volume ]
```

Deploy private: `docker compose up -d --build` di server. Reverse proxy opsional (Nginx/Caddy) untuk HTTPS bila expose.

## 7. Skema DB Awal (Prisma-style)

```
User(id, email unique, passwordHash, name, createdAt)
Property(id, name, address, note, createdAt)
Unit(id, propertyId FK, code, monthlyPrice, status: VACANT|OCCUPIED|MAINTENANCE, note)
Tenant(id, name required, phoneWa required, idNumber?, emergencyContact?, note, createdAt)
Lease(id, unitId FK, tenantId FK, startDate, endDate?, monthlyPriceSnapshot, deposit?, active bool)
  @@unique([unitId, active]) partial — ditegakkan via app logic (1 aktif per unit)
Bill(id, leaseId FK, unitId FK, tenantId FK, period YYYY-MM, amount snapshot, dueDate date required, status, note, createdAt)
  @@unique([unitId, period])  // anti duplikat generate
Payment(id, billId FK non-unique + index, paidAt, amount, method: CASH|TRANSFER required, proofPath?, note) // v0.4: 1 bill boleh N payment (cicilan); 1 file bukti boleh dipakai N payment (bulk)
Expense(id, propertyId? FK, date, category, amount, note, proofPath?)
Setting(key unique, value) // cth. defaultDueDay=5, ownerName utk template WA/invoice
```

Catatan: `Bill.amount` snapshot (tidak ikut berubah saat harga unit berubah). Status dihitung dari total payment: `paid` jika total >= amount, `partial` jika 0 < total < amount, else `overdue` jika now > dueDate, else `unpaid`. `Payment.proofPath` wajib bila TRANSFER.

## 8. Halaman / Routes MVP

```
<&> Auth: /login, /signup (email+password internal saja)
<&> App shell SPA: / (satu halaman utama, Tabs: Dashboard | Properti | Penghuni | Tagihan | Kas)
  - Semua CRUD via Sheet/Dialog/Drawer (contoh: PropertiFormSheet, UnitFormDialog, TenantFormSheet, BillPayDialog, ExpenseSheet)
  - Detail tagihan = Dialog/Drawer kanan, bukan route baru. Invoice tetap route khusus /tagihan/[id]/invoice (print-friendly, buka tab baru)
  - Query state (tab, filter, period) via zustand + URL searchParams ringan biar bisa share/back
/ (dashboard + banner alarm overdue)
/pengaturan (ganti password, nama owner, default tgl jatuh tempo, status backup terakhir)
```

Aturan UX: tidak ada CRUD yang full-page redirect kecuali login/signup/invoice-print. Setiap mutasi → `toast.success/toast.error` + invalidate TanStack Query + tutup sheet.


Komponen kunci: `StatusBadge`, `BillTable`, `WaButton`, `UploadBukti`, `KuitansiPrint`, `KasSummary`, `DashboardCards`.

## 9. API / Server Actions (garis besar)

- `listDashboard(month)` → kartu + tunggakan + chart.
- `generateBills({propertyId, period, dueDate})` → idempotent bulk create.
- `payBill({billId, paidAt, amount, method, proof})`, `deleteBill(id)` (hanya unpaid).
- CRUD: `properties`, `units`, `tenants`, `leases(checkin/checkout)`, `expenses`.
- `cashReport({month, propertyId})` + `exportCsv`.
- Semua input divalidasi zod di server. Semua mutasi log `createdAt/updatedAt`.

## 10. Docker & ENV

`docker-compose.yml`:
- `db`: `postgres:16-alpine`, volume `pgdata`, healthcheck `pg_isready`.
- `web`: build Next `standalone`, `DATABASE_URL=postgresql://kontrakan:xxx@db:5432/kontrakan`, `UPLOAD_DIR=/app/uploads` + volume, port `3000:3000`, `depends_on: db healthy`.

`.env.example`:
```
DATABASE_URL=postgresql://kontrakan:changeme@db:5432/kontrakan
AUTH_SECRET=changeme-generate-openssl-rand-hex-32
ADMIN_EMAIL=agusprnyt@gmail.com
OWNER_NAME=Pak Agus
```

Acceptance ops: fresh clone → `cp .env.example .env` → `docker compose up -d --build` → buka `:3000/login` bisa login → Prisma migrate otomatis saat start.

### 10.2 Upload Lokal — hanya Bukti TF (keputusan 5 Okt)
- `public/` hanya untuk aset build-time (logo, icon). Upload user WAJIB di volume lokal `UPLOAD_DIR=/app/data/uploads`, diserve via route `/api/files/...` (auth required). Bukan di `public/`.
- **Satu-satunya upload di MVP: Bukti Transfer pembayaran** (`Payment.proofPath`). KTP / nota / foto unit = TIDAK ADA (dihapus biar simpel).
- **Anti-bengkak (wajib implement):**
  - Hard limit: tolak file >2MB di client + server (zod + route check).
  - Format: hanya `jpg/jpeg/png/webp` (PDF TIDAK diterima di MVP biar kecil). HEIC ditolak dengan pesan jelas.
  - Auto-kompres server via `sharp`: max sisi panjang 1280px, JPEG q70 / WebP q70, strip EXIF. Target hasil <500KB/file.
  - 1 tagihan = max 1 file bukti. Upload baru = timpa + hapus file lama (tidak numpuk orphan).
  - Hapus bill unpaid → hapus file-nya. Void payment → hapus file-nya. Cron mingguan hapus orphan (file tanpa referensi DB >7 hari).
  - Estimasi: 100 tagihan/tahun x ~400KB = ~40MB/tahun. Aman.
- Path DB: relatif `bukti/2026/01/<billId>-<uuid>.jpg`. Preview via `next/image` dari route files.

### 10.1 Backup Mingguan ke Google Drive (anti server fisik rusak)
- **Target:** DB dump + folder `/uploads` (bukti TF, KTP, invoice) di-backup mingguan ke Drive.
- **Cara:** service `backup` di compose (alpine + `postgresql-client` + `rclone` + cron). Cron tiap Minggu 02:00 Asia/Jakarta:
  1. `pg_dump -Fc -U kontrakan -h db kontrakan > /backup/kontrakan-YYYYMMDD.dump`
  2. `tar -czf /backup/uploads-YYYYMMDD.tar.gz /uploads`
  3. `rclone copy /backup gdrive:web-kontrakan-backup/`
  4. Hapus file lokal >7 hari, hapus di Drive yang >30 hari (retensi 4x mingguan).
- **Auth Drive:** via `rclone` token (setup sekali di laptop → paste `RCLONE_GDRIVE_TOKEN` ke `.env` server). Alternatif service-account + share folder.
- **Enkripsi (opsional MVP+1):** `gpg`/`age` sebelum upload bila invoice/KTP dianggap sensitif.
- **Monitoring:** log container `backup`, file `BACKUP_LAST_OK` timestamp; tampilkan status backup terakhir di `/pengaturan`. Gagal 2x → banner merah di dashboard.
- **Restore drill:** UAT wajib 1x restore dari Drive ke DB kosong berhasil.
- **ENV tambahan:** `RCLONE_GDRIVE_TOKEN=...`, `GDRIVE_FOLDER=web-kontrakan-backup`, `BACKUP_CRON=0 2 * * 0`, `BACKUP_RETENTION_DAYS=30`.

## 11. Kriteria Penerimaan (UAT checklist — mapping 7 poin)

1. Buat penghuni wajib isi nama + no.telp; input 08xx tersimpan jadi 62xx (#1, #2).
2. Buat 1 properti + 3 unit (isi harga) + 2 penghuni + check-in 2 unit (#4).
3. Generate tagihan Jan 2026 dengan jatuh tempo tgl 5 → 2 tagihan muncul dengan dueDate benar, generate ulang tidak duplikat (#3).
4. Dashboard tampil banner merah + badge H+N untuk yg overdue, kuning H-7 untuk yg dekat (#5).
5. Bayar 1 tagihan via CASH tanpa bukti → lunas; bayar 1 via TRANSFER wajib upload bukti (#6). Bayar sebagian (nyicil) → badge Nyicil + sisa, tombol Bayar sisa tetap ada; nominal > sisa ditolak.
5b. Bayar 3 bulan sekaligus (bulk) → 3 pembayaran + invoice gabungan 3 baris + total benar. TRANSFER bulk = 1 bukti dipakai bersama.
5c. Void 1 cicilan → sisa bertambah lagi; file bukti tetap ada selama dipakai pembayaran lain.
6. Klik WA tagih → terbuka wa.me dengan teks + nomor 62 + nominal + jatuh tempo benar.
7. Cetak Invoice tagihan lunas → ada no. INV, nama/telp, periode, jatuh tempo, metode (#7). Tagihan belum lunas tidak bisa cetak.
8. Input 1 pengeluaran → laporan kas akurat + CSV terunduh.
9. Checkout penghuni → generate bulan depan tidak membuat tagihan untuk unit kosong itu.
10. Reboot container (`down` + `up`) → data tidak hilang.

## 12. Risiko & Keputusan

- Upload lokal hilang jika volume tidak di-backup → mitigasi: volume named + instruksi backup di README.
- Nomor WA salah format → normalisasi + validasi di form.
- Harga sewa berubah → snapshot di Lease & Bill, tidak retroaktif.
- Scope creep (mau seperti KelolaPro penuh) → kunci MVP 4.5–4.11, sisanya Phase 2.

## 13. Langkah Berikutnya

1. Setuju/koreksi PRD ini.
2. Scaffold: Next.js + Prisma + Docker + Auth + halaman Properti/Unit (slice vertikal pertama).
3. Iterasi per fitur: Penghuni → Tagihan → Bayar+Kuitansi → WA → Kas/Dashboard.
4. UAT checklist §11 di private server.

---

## 14. ⏰ PENGINGAT: Config Google Drive (WAJIB sebelum production!)

> **Status backup saat ini: BELUM DIAKTIFKAN.** Tanpa ini, kalau server fisik rusak → SEMUA DATA HILANG.
> Service `backup` jalan tapi SKIP upload sampai config diisi (file hanya tersimpan lokal 7 hari).

**Yang harus kamu lakukan (sekali, ±5 menit, detail di `backup/README.md`):**

- [ ] 1. Di laptop: install rclone (`brew install rclone`), lalu `rclone config` → New remote `gdrive` → ikuti login Google di browser.
- [ ] 2. `rclone mkdir gdrive:web-kontrakan-backup` (test tulis).
- [ ] 3. Copy isi `~/.config/rclone/rclone.conf` ke file `rclone.conf` di folder project ini (sejajar `docker-compose.yml`).
- [ ] 4. Di server: `docker compose up -d --build backup` → cek `docker compose logs -f backup` sampai muncul `[backup] OK`.
- [ ] 5. Drill restore 1x (perintah ada di `backup/README.md`) — pastikan file `.dump` bisa dibalikkan ke DB kosong.
- [ ] 6. Cek halaman Pengaturan → "Backup terakhir" sudah tampil tanggal (bukan "belum pernah").

**Jadwal:** tiap Minggu 02:00 Asia/Jakarta, retensi 4 mingguan di Drive. Kalau ganti akun Google / token expired → ulangi langkah 1–3.
