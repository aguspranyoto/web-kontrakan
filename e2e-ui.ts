// E2E UI test (headless Chromium) ke Docker web http://localhost:3000
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const SHOT = "/tmp/wk-ui";
const shot = (page: import("@playwright/test").Page, n: string) => page.screenshot({ path: `${SHOT}/${n}.png` });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // 1. signup admin
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Nama").fill("Pak Agus");
  await page.getByLabel("Email").fill("agusprnyt@gmail.com");
  await page.getByLabel("Password").fill("rahasia123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  console.log("1. signup+login OK");

  // 2. dashboard kosong
  await page.getByRole("tab", { name: "Home" }).click();
  await shot(page, "01-dashboard");
  console.log("2. dashboard shot");

  // 3. tambah kontrakan via Sheet
  await page.getByRole("tab", { name: "Unit" }).click();
  await page.getByRole("button", { name: "+ Kontrakan" }).click();
  await page.getByLabel("Nama kontrakan").fill("Kontrakan UI Tes");
  await page.getByLabel("Alamat").fill("Jl UI No 1");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByText("Properti tersimpan").waitFor({ timeout: 10000 });
  console.log("3. tambah kontrakan OK (toast)");

  // 4. tambah unit
  await page.getByRole("button", { name: "+ Unit" }).click();
  await page.getByText("Pilih kontrakan").click();
  await page.getByRole("option", { name: "Kontrakan UI Tes" }).click();
  await page.getByLabel(/Kode unit/).fill("A1");
  await page.getByLabel(/Harga/).fill("1500000");
  await page.getByRole("button", { name: "Simpan unit" }).click();
  await page.getByText("Unit tersimpan").waitFor({ timeout: 10000 });
  await shot(page, "02-unit");
  console.log("4. tambah unit OK");

  // 5. tambah penghuni + checkin
  await page.getByRole("tab", { name: "Penghuni" }).click();
  await page.getByRole("button", { name: "+ Penghuni" }).click();
  await page.getByLabel(/Nama yg ngontrak/).fill("Budi UI");
  await page.getByLabel(/No\. telp/).fill("081298765432");
  await page.getByRole("button", { name: "Simpan penghuni" }).click();
  await page.getByText("Penghuni tersimpan").waitFor({ timeout: 10000 });
  console.log("5. tambah penghuni OK");
  await page.getByRole("button", { name: "Check-in" }).click();
  await page.getByText("Pilih unit").click();
  await page.getByRole("option", { name: /A1/ }).click();
  await page.getByText("Pilih penghuni").click();
  await page.getByRole("option", { name: "Budi UI" }).click();
  await page.locator('input[type="date"]').fill("2026-10-01");
  await page.getByRole("button", { name: "Check-in", exact: true }).click();
  await page.getByText("ditempatkan ke unit").waitFor({ timeout: 10000 });
  await shot(page, "03-penghuni");
  console.log("6. checkin OK");

  // 6. generate tagihan
  await page.getByRole("tab", { name: "Tagihan" }).click();
  await page.getByRole("button", { name: "Generate" }).click();
  await page.getByText("Pilih kontrakan").click();
  await page.getByRole("option", { name: "Kontrakan UI Tes" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.locator('input[type="month"]').fill("2026-10");
  await dlg.locator('input[type="date"]').fill("2026-10-05");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await page.getByText(/Tagihan dibuat/).waitFor({ timeout: 10000 });
  await shot(page, "04-tagihan");
  console.log("7. generate OK");

  // 7. bayar CASH
  await page.getByRole("button", { name: "Bayar" }).click();
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page.getByRole("button", { name: "Simpan lunas" }).click();
  await page.getByText("Pembayaran lunas tersimpan").waitFor({ timeout: 10000 });
  await shot(page, "05-lunas");
  console.log("8. bayar CASH OK");

  // 8. kas + pengeluaran
  await page.getByRole("tab", { name: "Kas" }).click();
  await page.getByRole("button", { name: "+ Keluar" }).click();
  const sh = page.locator('[role="dialog"]');
  await sh.locator('input[type="date"]').fill("2026-10-03");
  await sh.locator('input[type="number"]').fill("200000");
  await sh.locator('input[placeholder="Benerin atap bocor"]').fill("Benerin keran");
  await sh.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByText("Pengeluaran tersimpan").waitFor({ timeout: 10000 });
  await shot(page, "06-kas");
  console.log("9. kas OK");

  // 9. pengaturan
  await page.goto(`${BASE}/pengaturan`);
  await shot(page, "07-pengaturan");
  console.log("10. pengaturan shot");

  // 10. dark mode
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Ganti tema" }).click();
  await page.waitForTimeout(500);
  await shot(page, "08-dark");
  console.log("11. dark shot");

  // 11. mobile viewport (sesi sama — resize)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}/09-mobile.png` });
  console.log("12. mobile shot");

  await browser.close();
  console.log("SEMUA UI E2E LOLOS");
}

main().catch((e) => { console.error("UI E2E GAGAL:", e); process.exit(1); });
