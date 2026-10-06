"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/store";
import type { Bill, Expense } from "@/lib/tab-types";
import { formatIDR, formatDateID, periodLabel } from "@/lib/format";

// Tab Kas: ringkasan masuk/keluar/saldo + daftar pengeluaran + export CSV.
export function KasTab({ billPeriod }: { billPeriod: string }) {
  const { openSheet } = useUI();

  const bills = useQuery({
    queryKey: ["bills", billPeriod, "all"],
    queryFn: async () => {
      const r = await fetch(`/api/bills?period=${billPeriod}`);
      if (!r.ok) throw new Error("Gagal muat tagihan");
      return (await r.json()) as Bill[];
    },
  });
  const expenses = useQuery({
    queryKey: ["expenses", billPeriod],
    queryFn: async () => {
      const r = await fetch(`/api/expenses?month=${billPeriod}`);
      if (!r.ok) throw new Error("Gagal muat kas");
      return (await r.json()) as Expense[];
    },
  });

  const income = (bills.data ?? []).reduce((s, b) => s + b.paidTotal, 0);
  const outcome = (expenses.data ?? []).reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Kas {periodLabel(billPeriod)}</h2>
        <Button size="sm" onClick={() => openSheet("expense-form")}>+ Keluar</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Masuk", formatIDR(income)],
          ["Keluar", formatIDR(outcome)],
          ["Saldo", formatIDR(income - outcome)],
        ].map(([l, v]) => (
          <Card key={l}><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{l}</p><p className="text-sm font-bold">{v}</p></CardContent></Card>
        ))}
      </div>
      {(expenses.data ?? []).map((e) => (
        <Card key={e.id}>
          <CardContent className="flex items-center justify-between gap-2 pt-4 text-sm">
            <div>
              <p className="font-medium">{e.category} · {formatIDR(e.amount)}</p>
              <p className="text-xs text-muted-foreground">{formatDateID(e.date)} · {e.property?.name ?? "Bersama"} · {e.note}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {(expenses.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengeluaran bulan ini.</p>}
      <Button variant="outline" onClick={() => {
        const rows = [["tanggal", "kategori", "properti", "nominal", "catatan"], ...((expenses.data ?? []).map((e) => [e.date, e.category, e.property?.name ?? "", String(e.amount), e.note]))];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `kas-${billPeriod}.csv`;
        a.click();
        toast.success("CSV kas terunduh");
      }}>Export CSV</Button>
    </>
  );
}
