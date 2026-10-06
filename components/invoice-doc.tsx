import Image from "next/image";
import type { ReactNode } from "react";
import { PrintButton } from "@/components/print-button";
import { formatIDR } from "@/lib/format";

export type InvoiceLine = { desc: string; amount: number; status?: string };

// Kertas invoice/kuitansi shared: header logo + tabel N baris + total.
// Stempel LUNAS hanya bila allPaid (semua lunas).
export function InvoiceDoc({
  no,
  tenantName,
  tenantPhone,
  meta,
  lines,
  totalDibayar,
  allPaid,
  ownerName,
}: {
  no: string;
  tenantName: string;
  tenantPhone: string;
  meta: ReactNode;
  lines: InvoiceLine[];
  totalDibayar: number;
  allPaid: boolean;
  ownerName: string;
}) {
  const totalTagihan = lines.reduce((s, l) => s + l.amount, 0);
  const sisa = Math.max(0, totalTagihan - totalDibayar);
  return (
    <main className="mx-auto max-w-xl bg-white p-6 text-black print:max-w-none">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">INVOICE / KUITANSI</h1>
          <p className="text-sm text-neutral-600">{no}</p>
        </div>
        <div className="flex justify-end">
          <Image
            src="/logo-kontrakan-pak-latif.png"
            alt="Kontrakan Pak Latif"
            width={220}
            height={147}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-4 text-sm">
        <div>
          <p className="text-neutral-500">Diterima dari</p>
          <p className="font-semibold">{tenantName}</p>
          <p>{tenantPhone}</p>
        </div>
        <div className="text-right">{meta}</div>
      </div>
      <div className="relative">
        {allPaid && (
          <Image
            src="/lunas.png"
            alt="LUNAS"
            width={560}
            height={373}
            className="opacity-50 pointer-events-none absolute top-1/2 left-1/2 z-10 w-[420px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 -rotate-12 object-contain select-none"
            priority
          />
        )}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-neutral-100">
              <th className="p-2 text-left">Keterangan</th>
              <th className="p-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">
                  {l.desc}
                  {l.status && <span className="text-neutral-500"> — {l.status}</span>}
                </td>
                <td className="p-2 text-right">{formatIDR(l.amount)}</td>
              </tr>
            ))}
            <tr className="border-b">
              <td className="p-2 font-bold">TOTAL TAGIHAN</td>
              <td className="p-2 text-right font-bold">{formatIDR(totalTagihan)}</td>
            </tr>
            <tr className={sisa > 0 ? "border-b" : ""}>
              <td className="p-2 font-bold">TOTAL DIBAYAR</td>
              <td className="p-2 text-right font-bold">{formatIDR(totalDibayar)}</td>
            </tr>
            {sisa > 0 && (
              <tr>
                <td className="p-2 font-bold">SISA</td>
                <td className="p-2 text-right font-bold">{formatIDR(sisa)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-8 text-sm">
        <div className="text-end">
          <p>Hormat kami,</p>
          <p className="mt-12 font-semibold">{ownerName}</p>
        </div>
      </div>
      <PrintButton />
    </main>
  );
}
