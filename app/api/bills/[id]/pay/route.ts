import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { remaining } from "@/lib/bill-status";
import { saveProof } from "@/lib/proof-upload";

// POST bayar 1 tagihan (boleh nyicil/partial): form-data { paidAt?, amount, method: CASH|TRANSFER, note?, file? (wajib bila TRANSFER) }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const bill = await db.bill.findUnique({ where: { id }, include: { payments: true } });
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ada" }, { status: 404 });
  const rest = remaining(bill);
  if (rest <= 0) return NextResponse.json({ error: "Tagihan sudah lunas" }, { status: 409 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form tidak valid" }, { status: 400 });
  const method = String(form.get("method") ?? "");
  if (method !== "CASH" && method !== "TRANSFER")
    return NextResponse.json({ error: "Metode harus CASH / TRANSFER" }, { status: 400 });
  const amount = Number(form.get("amount") ?? rest);
  if (!Number.isInteger(amount) || amount < 1)
    return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  if (amount > rest)
    return NextResponse.json({ error: `Nominal melebihi sisa (sisa ${rest})` }, { status: 400 });

  let proofPath = "";
  if (method === "TRANSFER") {
    try {
      proofPath = await saveProof(form.get("file"), id);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload bukti gagal" }, { status: 400 });
    }
  }

  const paidAtRaw = form.get("paidAt");
  const paidAt = paidAtRaw ? new Date(String(paidAtRaw)) : new Date();
  const payment = await db.payment.create({
    data: { billId: id, paidAt, amount, method, proofPath, note: String(form.get("note") ?? "") },
  });
  return NextResponse.json(payment, { status: 201 });
}
