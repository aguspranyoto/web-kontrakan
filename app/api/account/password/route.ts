import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

// POST ganti password owner
export async function POST(req: Request) {
  const session = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({ oldPassword: z.string().min(1), newPassword: z.string().min(6, "Password baru minimal 6 karakter") })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: session.email! } });
  if (!user) return NextResponse.json({ error: "User tidak ada" }, { status: 404 });
  const ok = await bcrypt.compare(parsed.data.oldPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Password lama salah" }, { status: 403 });
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return NextResponse.json({ ok: true });
}
