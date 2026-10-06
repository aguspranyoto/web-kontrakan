import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

// GET /api/dashboard?month=YYYY-MM — kartu + alarm overdue/H-7 + pemasukan 6 bln
export async function GET(req: Request) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = searchParams.get("month") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);
  const gte = new Date(y, m - 1, 1);
  const lt = new Date(y, m, 1);

  const [units, bills, paymentsMonth, expensesMonth] = await Promise.all([
    db.unit.findMany({ include: { leases: { where: { active: true } } } }),
    db.bill.findMany({ include: { payments: true, unit: { include: { property: true } }, tenant: true } }),
    db.payment.findMany({ where: { paidAt: { gte, lt } } }),
    db.expense.findMany({ where: { date: { gte, lt } } }),
  ]);

  const totalUnits = units.length;
  const occupied = units.filter((u) => u.leases.length > 0).length;
  const income = paymentsMonth.reduce((s, p) => s + p.amount, 0);
  const outcome = expensesMonth.reduce((s, e) => s + e.amount, 0);

  const overdue = bills
    .map((b) => ({ b, rest: b.amount - b.payments.reduce((s, p) => s + p.amount, 0) }))
    .filter(({ rest }) => rest > 0)
    .filter(({ b }) => new Date(b.dueDate) < now)
    .sort((x, y) => +new Date(x.b.dueDate) - +new Date(y.b.dueDate))
    .slice(0, 10)
    .map(({ b, rest }) => ({
      id: b.id, period: b.period, amount: b.amount, remaining: rest, dueDate: b.dueDate,
      lateDays: Math.floor((now.getTime() - +new Date(b.dueDate)) / 86400000),
      tenant: b.tenant.name, phoneWa: b.tenant.phoneWa,
      unit: b.unit.code, property: b.unit.property.name,
    }));
  const dueSoon = bills
    .filter((b) => {
      const rest = b.amount - b.payments.reduce((s, p) => s + p.amount, 0);
      if (rest <= 0) return false;
      const diff = Math.ceil((+new Date(b.dueDate) - now.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    })
    .slice(0, 10)
    .map((b) => ({
      id: b.id, period: b.period, amount: b.amount,
      remaining: b.amount - b.payments.reduce((s, p) => s + p.amount, 0), dueDate: b.dueDate,
      tenant: b.tenant.name, unit: b.unit.code, property: b.unit.property.name,
    }));

  // pemasukan 6 bulan terakhir
  const monthly: { month: string; income: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const ps = await db.payment.findMany({
      where: { paidAt: { gte: new Date(d.getFullYear(), d.getMonth(), 1), lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) } },
      select: { amount: true },
    });
    monthly.push({ month: mm, income: ps.reduce((s, p) => s + p.amount, 0) });
  }

  return NextResponse.json({
    month, totalUnits, occupied, vacant: totalUnits - occupied,
    income, outcome, balance: income - outcome,
    overdueCount: overdue.length, overdueNominal: overdue.reduce((s, o) => s + o.remaining, 0),
    overdue, dueSoon, monthly,
  });
}
