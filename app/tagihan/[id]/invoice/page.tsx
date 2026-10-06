import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InvoiceDoc } from "@/components/invoice-doc";
import { formatIDR, formatDateID, periodLabel } from "@/lib/format";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const bill = await db.bill.findUnique({
    where: { id },
    include: { unit: { include: { property: true } }, tenant: true, payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!bill) notFound();
  const paid = bill.payments.reduce((s, p) => s + p.amount, 0);
  if (paid <= 0) notFound(); // invoice hanya bila ada pembayaran

  const owner = await db.setting.findUnique({ where: { key: "ownerName" } });
  const no = `INV/${bill.period.replace("-", "")}/${bill.id.slice(-6).toUpperCase()}`;
  const last = bill.payments.at(-1);
  if (!last) notFound(); // sudah dicek paid > 0, jaga-jaga tipe
  const methods = [...new Set(bill.payments.map((p) => p.method))].join("+");
  const sisa = bill.amount - paid;

  return (
    <InvoiceDoc
      no={no}
      tenantName={bill.tenant.name}
      tenantPhone={bill.tenant.phoneWa}
      meta={
        <>
          {/* <p className="text-neutral-500">Periode</p>
          <p className="font-semibold">{periodLabel(bill.period)}</p> */}
          <p>Jatuh tempo: {formatDateID(bill.dueDate)}</p>
          <p>
            Dibayar: {formatDateID(last.paidAt)} ({methods})
            {bill.payments.length > 1 && ` · ${bill.payments.length}x bayar`}
          </p>
        </>
      }
      lines={[
        {
          desc: `Sewa periode ${periodLabel(bill.period)}`,
          amount: bill.amount,
          status: sisa <= 0 ? "Lunas" : `Sisa ${formatIDR(sisa)}`,
        },
      ]}
      totalDibayar={paid}
      allPaid={sisa <= 0}
      ownerName={owner?.value ?? "Owner"}
    />
  );
}
