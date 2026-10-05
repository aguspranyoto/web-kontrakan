import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Upload bukti TF: jpg/png/webp, tolak >2MB, kompres <500KB (PRD §10.2)
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 2097152);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/data/uploads";
const ALLOW = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File wajib diisi" }, { status: 400 });
  if (!ALLOW.has(file.type)) return NextResponse.json({ error: "Format harus JPG/PNG/WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File maksimal 2MB" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const dir = path.join(
    UPLOAD_DIR, "bukti",
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  const out = path.join(dir, name);

  await sharp(buf)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toFile(out);

  const stat = await fs.stat(out);
  const rel = path.relative(UPLOAD_DIR, out).replace(/\\/g, "/");
  return NextResponse.json({ ok: true, path: rel, bytes: stat.size }, { status: 201 });
}
