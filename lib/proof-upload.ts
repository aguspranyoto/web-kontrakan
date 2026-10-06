import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 2097152);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/data/uploads";
const ALLOW = new Set(["image/jpeg", "image/png", "image/webp"]);

// Simpan 1 file bukti TF (kompres <500KB). Return path relatif utk DB.
export async function saveProof(file: unknown, nameHint: string): Promise<string> {
  if (!(file instanceof File)) throw new Error("Bukti transfer wajib diupload");
  if (!ALLOW.has(file.type)) throw new Error("Format bukti harus JPG/PNG/WebP");
  if (file.size > MAX_BYTES) throw new Error("Bukti maksimal 2MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const dir = path.join(
    UPLOAD_DIR, "bukti",
    String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"),
  );
  await fs.mkdir(dir, { recursive: true });
  const safe = nameHint.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "bukti";
  const out = path.join(dir, `${safe}-${randomUUID()}.jpg`);
  await sharp(buf)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toFile(out);
  return path.relative(UPLOAD_DIR, out).replace(/\\/g, "/");
}

// Hapus file bukti hanya jika sudah tidak dipakai payment manapun (buat bulk 1-file).
export async function deleteProofIfOrphan(proofPath: string): Promise<void> {
  if (!proofPath) return;
  const used = await db.payment.count({ where: { proofPath } });
  if (used > 0) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, proofPath));
  } catch { /* file sudah hilang — abaikan */ }
}
