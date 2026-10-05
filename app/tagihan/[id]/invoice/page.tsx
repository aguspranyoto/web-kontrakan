import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { formatIDR, formatDateID, periodLabel } from "@/lib/format";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const bill = await db.bill.findUnique({
    where: { id },
    include: { unit: { include: { property: true } }, tenant: true, payment: true, lease: true },
  });
  if (!bill) notFound();
  if (!bill.payment) notFound(); // invoice hanya untuk yg lunas (PRD §4.7)

  const owner = await db.setting.findUnique({ where: { key: "ownerName" } });
  const no = `INV/${bill.period.replace("-", "")}/${bill.id.slice(-6).toUpperCase()}`;

  return (
    <main className="mx-auto max-w-xl bg-white p-6 text-black print:max-w-none">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">INVOICE / KUITANSI</h1>
          <p className="text-sm text-neutral-600">{no}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{bill.unit.property.name}</p>
          <p className="text-neutral-600">{bill.unit.property.address}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-4 text-sm">
        <div>
          <p className="text-neutral-500">Diterima dari</p>
          <p className="font-semibold">{bill.tenant.name}</p>
          <p>{bill.tenant.phoneWa}</p>
          <p>Unit {bill.unit.code}</p>
        </div>
        <div className="text-right">
          <p className="text-neutral-500">Periode</p>
          <p className="font-semibold">{periodLabel(bill.period)}</p>
          <p>Jatuh tempo: {formatDateID(bill.dueDate)}</p>
          <p>Dibayar: {formatDateID(bill.payment.paidAt)} ({bill.payment.method})</p>
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y bg-neutral-100">
            <th className="p-2 text-left">Keterangan</th>
            <th className="p-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">Sewa {bill.unit.code} periode {periodLabel(bill.period)}</td>
            <td className="p-2 text-right">{formatIDR(bill.amount)}</td>
          </tr>
          <tr>
            <td className="p-2 font-bold">TOTAL DIBAYAR</td>
            <td className="p-2 text-right font-bold">{formatIDR(bill.payment.amount)}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-between pt-8 text-sm">
        <p className="text-neutral-500">{bill.payment.note || no}</p>
        <div className="text-center">
          <p>Hormat kami,</p>
          <p className="mt-12 font-semibold">{owner?.value ?? "Owner"}</p>
        </div>
      </div>
      <PrintButton />
    </main>
  );
}
