import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { propertySchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = propertySchema.partial().safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const updated = await db.property.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const units = await db.unit.count({ where: { propertyId: id } });
  if (units > 0)
    return NextResponse.json({ error: "Masih ada unit di kontrakan ini — hapus/arsipkan unit dulu" }, { status: 409 });
  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
