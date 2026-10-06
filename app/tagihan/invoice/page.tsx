import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InvoiceDoc } from "@/components/invoice-doc";
import { formatIDR, formatDateID, periodLabel } from "@/lib/format";

// Invoice gabungan: /tagihan/invoice?ids=id1,id2,id3 — 1 kuitansi utk bayar
// banyak periode sekaligus (Sept, Okt, Nov ke bawah). Stempel LUNAS hanya
// bila semua lunas; cicilan tampil status sisa per baris.
export default async function CombinedInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { ids } = await searchParams;
  const idList = [...new Set(String(ids ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 50);
  if (idList.length === 0) notFound();

  const bills = await db.bill.findMany({
    where: { id: { in: idList } },
    include: { unit: true, tenant: true, payments: { orderBy: { paidAt: "asc" } } },
    orderBy: { period: "asc" },
  });
  if (bills.length === 0) notFound();
  if (new Set(bills.map((b) => b.tenantId)).size > 1)
    return (
      <main className="mx-auto max-w-xl bg-white p-6 text-sm text-black">
        Gabungan hanya untuk 1 penghuni yg sama.
      </main>
    );

  const rows = bills.map((b) => {
    const paid = b.payments.reduce((s, p) => s + p.amount, 0);
    return { b, paid, sisa: b.amount - paid };
  });
  const totalDibayar = rows.reduce((s, r) => s + r.paid, 0);
  if (totalDibayar <= 0) notFound(); // belum ada pembayaran
  const allPaid = rows.every((r) => r.sisa <= 0);

  const owner = await db.setting.findUnique({ where: { key: "ownerName" } });
  const t = rows[0].b.tenant;
  const no = `INV/GAB/${rows[0].b.period.replace("-", "")}/${rows[0].b.id.slice(-6).toUpperCase()}`;
  const lastPaid = rows
    .flatMap((r) => r.b.payments)
    .sort((a, b) => +new Date(a.paidAt) - +new Date(b.paidAt))
    .at(-1)!;

  return (
    <InvoiceDoc
      no={no}
      tenantName={t.name}
      tenantPhone={t.phoneWa}
      meta={
        <>
          <p className="text-neutral-500">{rows.length} periode</p>
          <p className="font-semibold">
            {periodLabel(rows[0].b.period)}
            {rows.length > 1 && ` – ${periodLabel(rows[rows.length - 1].b.period)}`}
          </p>
          <p>Dibayar terakhir: {formatDateID(lastPaid.paidAt)} ({lastPaid.method})</p>
          <p>{rows.flatMap((r) => r.b.payments).length}x pembayaran</p>
        </>
      }
      lines={rows.map((r) => ({
        desc: `Sewa ${r.b.unit.code} periode ${periodLabel(r.b.period)}`,
        amount: r.b.amount,
        status: r.sisa <= 0 ? "Lunas" : `Sisa ${formatIDR(r.sisa)}`,
      }))}
      totalDibayar={totalDibayar}
      allPaid={allPaid}
      ownerName={owner?.value ?? "Owner"}
    />
  );
}
