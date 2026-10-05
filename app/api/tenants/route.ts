import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { tenantSchema } from "@/lib/validations";

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const items = await db.tenant.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phoneWa: { contains: q } }] } : {},
    orderBy: { name: "asc" },
    include: {
      leases: {
        where: { active: true },
        include: { unit: { include: { property: true } } },
        take: 1,
      },
    },
    take: 200,
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = tenantSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const created = await db.tenant.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
