import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { expenseSchema } from "@/lib/validations";

export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  let gte: Date | undefined;
  let lt: Date | undefined;
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    gte = new Date(y, m - 1, 1);
    lt = new Date(y, m, 1);
  }
  const items = await db.expense.findMany({
    where: gte && lt ? { date: { gte, lt } } : {},
    orderBy: { date: "desc" },
    include: { property: true },
    take: 300,
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const created = await db.expense.create({
    data: {
      propertyId: parsed.data.propertyId || null,
      date: parsed.data.date,
      category: parsed.data.category,
      amount: parsed.data.amount,
      note: parsed.data.note,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
