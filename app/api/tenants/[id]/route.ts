import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { tenantSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = tenantSchema.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const updated = await db.tenant.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const active = await db.lease.findFirst({ where: { tenantId: id, active: true } });
  if (active) return NextResponse.json({ error: "Penghuni masih menghuni unit — checkout dulu" }, { status: 409 });
  await db.tenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
