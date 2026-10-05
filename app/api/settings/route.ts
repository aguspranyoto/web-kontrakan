import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

const BACKUP_FLAG = "/tmp/backup/BACKUP_LAST_OK";

// GET: ownerName, defaultDueDay, backup terakhir, info akun
export async function GET() {
  const session = await requireUser();
  const [owner, dueDay] = await Promise.all([
    db.setting.findUnique({ where: { key: "ownerName" } }),
    db.setting.findUnique({ where: { key: "defaultDueDay" } }),
  ]);
  let backupLastOk: string | null = null;
  try {
    backupLastOk = (await fs.readFile(BACKUP_FLAG, "utf8")).trim();
  } catch { /* belum pernah backup */ }
  return NextResponse.json({
    email: session.email,
    ownerName: owner?.value ?? "",
    defaultDueDay: dueDay?.value ?? "5",
    backupLastOk,
  });
}

export async function PATCH(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      ownerName: z.string().min(2).max(100).optional(),
      defaultDueDay: z.coerce.number().int().min(1).max(28).optional(),
    })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  if (parsed.data.ownerName !== undefined)
    await db.setting.upsert({
      where: { key: "ownerName" },
      update: { value: parsed.data.ownerName },
      create: { key: "ownerName", value: parsed.data.ownerName },
    });
  if (parsed.data.defaultDueDay !== undefined)
    await db.setting.upsert({
      where: { key: "defaultDueDay" },
      update: { value: String(parsed.data.defaultDueDay) },
      create: { key: "defaultDueDay", value: String(parsed.data.defaultDueDay) },
    });
  return NextResponse.json({ ok: true });
}
