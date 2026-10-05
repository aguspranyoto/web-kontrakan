import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/data/uploads";

// POST void pembayaran (batalkan lunas + hapus file bukti biar tidak numpuk)
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const bill = await db.bill.findUnique({ where: { id }, include: { payment: true } });
  if (!bill?.payment) return NextResponse.json({ error: "Tagihan belum lunas" }, { status: 404 });
  if (bill.payment.proofPath) {
    try {
      await fs.unlink(path.join(UPLOAD_DIR, bill.payment.proofPath));
    } catch { /* file sudah hilang — abaikan */ }
  }
  await db.payment.delete({ where: { billId: id } });
  return NextResponse.json({ ok: true });
}
