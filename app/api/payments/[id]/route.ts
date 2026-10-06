import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { deleteProofIfOrphan } from "@/lib/proof-upload";

// DELETE /api/payments/[id] — void 1 pembayaran (cicilan). File bukti dihapus hanya jika tak dipakai payment lain.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Pembayaran tidak ada" }, { status: 404 });
  await db.payment.delete({ where: { id } });
  await deleteProofIfOrphan(payment.proofPath);
  return NextResponse.json({ ok: true });
}
