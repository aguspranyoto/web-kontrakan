import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { propertySchema } from "@/lib/validations";

export async function GET() {
  await requireUser();
  const items = await db.property.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { units: true } } },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const created = await db.property.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}
