import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { remaining } from "@/lib/bill-status";
import { saveProof } from "@/lib/proof-upload";

// POST bayar banyak tagihan sekaligus (cth. 3 bulan): semua harus 1 penghuni yg sama.
// form-data { items: JSON [{billId, amount}], method: CASH|TRANSFER, paidAt?, note?, file? (1 file dipakai bersama bila TRANSFER) }
export async function POST(req: Request) {
  await requireUser();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form tidak valid" }, { status: 400 });

  const method = String(form.get("method") ?? "");
  if (method !== "CASH" && method !== "TRANSFER")
    return NextResponse.json({ error: "Metode harus CASH / TRANSFER" }, { status: 400 });

  let items: { billId: string; amount: number }[];
  try {
    items = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Daftar tagihan tidak valid" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50)
    return NextResponse.json({ error: "Pilih 1–50 tagihan" }, { status: 400 });

  const bills = await db.bill.findMany({
    where: { id: { in: items.map((i) => String(i.billId)) } },
    include: { payments: true },
  });
  if (bills.length !== items.length)
    return NextResponse.json({ error: "Ada tagihan tidak ditemukan" }, { status: 404 });
  const tenantIds = new Set(bills.map((b) => b.tenantId));
  if (tenantIds.size > 1)
    return NextResponse.json({ error: "Pilih tagihan 1 penghuni yg sama" }, { status: 400 });

  // validasi nominal per tagihan: 1..sisa (TF selalu pas, cegah overpay)
  const plan = items.map((i) => {
    const bill = bills.find((b) => b.id === String(i.billId))!;
    const rest = remaining(bill);
    const amount = Number(i.amount);
    return { bill, rest, amount };
  });
  for (const p of plan) {
    if (!Number.isInteger(p.amount) || p.amount < 1)
      return NextResponse.json({ error: `Nominal periode ${p.bill.period} tidak valid` }, { status: 400 });
    if (p.rest <= 0)
      return NextResponse.json({ error: `Periode ${p.bill.period} sudah lunas` }, { status: 409 });
    if (p.amount > p.rest)
      return NextResponse.json(
        { error: `Periode ${p.bill.period} melebihi sisa (sisa ${p.rest})` }, { status: 400 });
  }

  let proofPath = "";
  if (method === "TRANSFER") {
    try {
      proofPath = await saveProof(form.get("file"), `bulk-${plan[0].bill.period}`);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload bukti gagal" }, { status: 400 });
    }
  }

  const paidAtRaw = form.get("paidAt");
  const paidAt = paidAtRaw ? new Date(String(paidAtRaw)) : new Date();
  const note = String(form.get("note") ?? "");
  const payments = await db.$transaction(
    plan.map((p) =>
      db.payment.create({
        data: { billId: p.bill.id, paidAt, amount: p.amount, method, proofPath, note },
      }),
    ),
  );
  return NextResponse.json(
    { payments, billIds: plan.map((p) => p.bill.id) },
    { status: 201 },
  );
}
