import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { generateBillsSchema } from "@/lib/validations";

// GET /api/bills?propertyId=&period=YYYY-MM&status=unpaid|paid|overdue
export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId") || undefined;
  const period = searchParams.get("period") || undefined;
  const status = searchParams.get("status") || undefined; // overdue dihitung

  const bills = await db.bill.findMany({
    where: {
      ...(period ? { period } : {}),
      ...(propertyId ? { unit: { propertyId } } : {}),
    },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      payment: true,
    },
    orderBy: [{ dueDate: "asc" }],
    take: 500,
  });

  const now = new Date();
  const withStatus = bills.map((b) => ({
    ...b,
    computedStatus: b.payment ? "paid" : b.dueDate < now ? "overdue" : "unpaid",
    lateDays: b.payment ? 0 : Math.max(0, Math.floor((now.getTime() - new Date(b.dueDate).getTime()) / 86400000)),
  }));
  const filtered = status ? withStatus.filter((b) => b.computedStatus === status) : withStatus;
  return NextResponse.json(filtered);
}

// POST generate massal idempotent (anti-duplikat via @@unique unit+period)
export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = generateBillsSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const leases = await db.lease.findMany({
    where: { active: true, unit: { propertyId: parsed.data.propertyId } },
    include: { unit: true },
  });
  if (leases.length === 0)
    return NextResponse.json({ error: "Tidak ada unit terisi di properti ini" }, { status: 400 });

  let created = 0;
  for (const l of leases) {
    try {
      await db.bill.create({
        data: {
          leaseId: l.id,
          unitId: l.unitId,
          tenantId: l.tenantId,
          period: parsed.data.period,
          amount: l.monthlyPriceSnapshot,
          dueDate: parsed.data.dueDate,
        },
      });
      created++;
    } catch {
      // duplikat unit+period → skip (idempotent)
    }
  }
  return NextResponse.json({ ok: true, created, skipped: leases.length - created }, { status: 201 });
}
