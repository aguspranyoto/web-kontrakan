import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const lease = await db.lease.findUnique({ where: { id } });
  if (!lease || !lease.active) return NextResponse.json({ error: "Sewa tidak aktif" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.lease.update({ where: { id }, data: { active: false, endDate: new Date() } });
    await tx.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT" } });
  });
  return NextResponse.json({ ok: true });
}
