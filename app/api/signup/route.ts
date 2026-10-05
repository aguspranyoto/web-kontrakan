import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations";

// Signup internal: HANYA ADMIN_EMAIL yang boleh daftar (locked)
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }
  if (!ADMIN_EMAIL || parsed.data.email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Email tidak diizinkan mendaftar" }, { status: 403 });
  }
  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: { email: parsed.data.email, passwordHash, name: parsed.data.name },
  });
  await db.setting.upsert({
    where: { key: "ownerName" },
    update: {},
    create: { key: "ownerName", value: parsed.data.name },
  });
  return NextResponse.json({ ok: true, id: user.id });
}
