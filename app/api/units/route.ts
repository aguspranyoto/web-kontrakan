import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { unitSchema } from "@/lib/validations";

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId") ?? undefined;
  const items = await db.unit.findMany({
    where: propertyId ? { propertyId } : {},
    orderBy: { code: "asc" },
    include: { property: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    const created = await db.unit.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002")
      return NextResponse.json({ error: "Kode unit sudah dipakai di kontrakan ini" }, { status: 409 });
    throw e;
  }
}
