import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { checkinSchema } from "@/lib/validations";

// GET lease aktif (penghuni -> unit). ?tenantId= → riwayat lengkap 1 penghuni + tagihannya
export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") || undefined;
  const items = await db.lease.findMany({
    where: tenantId ? { tenantId } : { active: true },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      bills: { include: { payment: true }, orderBy: { period: "desc" } },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(items);
}

// POST check-in: 1 penghuni aktif per unit ditegakkan
export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const busy = await db.lease.findFirst({ where: { unitId: parsed.data.unitId, active: true } });
  if (busy) return NextResponse.json({ error: "Unit sudah dihuni" }, { status: 409 });

  const tenantBusy = await db.lease.findFirst({ where: { tenantId: parsed.data.tenantId, active: true } });
  if (tenantBusy) return NextResponse.json({ error: "Penghuni sudah menghuni unit lain" }, { status: 409 });

  const lease = await db.$transaction(async (tx) => {
    const l = await tx.lease.create({ data: { ...parsed.data, active: true } });
    await tx.unit.update({ where: { id: parsed.data.unitId }, data: { status: "OCCUPIED" } });
    return l;
  });
  return NextResponse.json(lease, { status: 201 });
}
