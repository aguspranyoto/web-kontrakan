import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { unitSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = unitSchema.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  // cegah set VACANT manual bila masih ada lease aktif
  if (parsed.data.status === "VACANT") {
    const active = await db.lease.findFirst({ where: { unitId: id, active: true } });
    if (active)
      return NextResponse.json({ error: "Unit masih dihuni — checkout penghuni dulu" }, { status: 409 });
  }
  const updated = await db.unit.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const active = await db.lease.findFirst({ where: { unitId: id, active: true } });
  if (active) return NextResponse.json({ error: "Unit masih dihuni" }, { status: 409 });
  const bills = await db.bill.count({ where: { unitId: id } });
  if (bills > 0) return NextResponse.json({ error: "Unit sudah punya riwayat tagihan — arsipkan saja" }, { status: 409 });
  await db.unit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
