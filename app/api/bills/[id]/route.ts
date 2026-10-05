import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { z } from "zod";

const patchSchema = z.object({
  amount: z.coerce.number().int().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const bill = await db.bill.findUnique({ where: { id }, include: { payment: true } });
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ada" }, { status: 404 });
  if (bill.payment) return NextResponse.json({ error: "Tagihan lunas tidak bisa diubah" }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const updated = await db.bill.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const bill = await db.bill.findUnique({ where: { id }, include: { payment: true } });
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ada" }, { status: 404 });
  if (bill.payment) return NextResponse.json({ error: "Tagihan lunas tidak bisa dihapus" }, { status: 409 });
  await db.bill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
