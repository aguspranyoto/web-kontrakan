import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 2097152);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/data/uploads";
const ALLOW = new Set(["image/jpeg", "image/png", "image/webp"]);

// POST bayar: form-data { paidAt?, amount, method: CASH|TRANSFER, note?, file? (wajib bila TRANSFER) }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const bill = await db.bill.findUnique({ where: { id }, include: { payment: true } });
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ada" }, { status: 404 });
  if (bill.payment) return NextResponse.json({ error: "Tagihan sudah lunas" }, { status: 409 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form tidak valid" }, { status: 400 });
  const method = String(form.get("method") ?? "");
  if (method !== "CASH" && method !== "TRANSFER")
    return NextResponse.json({ error: "Metode harus CASH / TRANSFER" }, { status: 400 });
  const amount = Number(form.get("amount") ?? bill.amount);
  if (!Number.isInteger(amount) || amount < 1)
    return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });

  let proofPath = "";
  const file = form.get("file");
  if (method === "TRANSFER") {
    if (!(file instanceof File))
      return NextResponse.json({ error: "Bukti transfer wajib diupload" }, { status: 400 });
    if (!ALLOW.has(file.type))
      return NextResponse.json({ error: "Format bukti harus JPG/PNG/WebP" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Bukti maksimal 2MB" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const dir = path.join(UPLOAD_DIR, "bukti", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, `${id}-${randomUUID()}.jpg`);
    await sharp(buf).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70, mozjpeg: true }).toFile(out);
    proofPath = path.relative(UPLOAD_DIR, out).replace(/\\/g, "/");
  }

  const paidAtRaw = form.get("paidAt");
  const paidAt = paidAtRaw ? new Date(String(paidAtRaw)) : new Date();
  const payment = await db.payment.create({
    data: { billId: id, paidAt, amount, method, proofPath, note: String(form.get("note") ?? "") },
  });
  return NextResponse.json(payment, { status: 201 });
}
