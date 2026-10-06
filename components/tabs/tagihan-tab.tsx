"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/field-select";
import { PayDialog } from "@/components/pay-dialog";
import { BulkPayDialog } from "@/components/bulk-pay-dialog";
import { GenerateDialog } from "@/components/generate-dialog";
import { useUI } from "@/lib/store";
import type { Bill } from "@/lib/tab-types";
import { formatIDR, formatDateID, periodLabel, daysLate } from "@/lib/format";
import { waLink, tagihText, telatText, lunasText } from "@/lib/wa";

const BILL_PER_PAGE = 8;

// Tab Tagihan: filter + pilih bulk + kartu + pagination + dialog bayar.
export function TagihanTab({
  billPeriod, setBillPeriod, billStatus, setBillStatus,
}: {
  billPeriod: string; setBillPeriod: (v: string) => void;
  billStatus: string; setBillStatus: (v: string) => void;
}) {
  const { openSheet, billId } = useUI();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]); // tagihan terpilih utk bayar bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [billPage, setBillPage] = useState(1);

  const bills = useQuery({
    queryKey: ["bills", billPeriod, billStatus],
    queryFn: async () => {
      const q = new URLSearchParams({ period: billPeriod });
      if (billStatus !== "all") q.set("status", billStatus);
      const r = await fetch(`/api/bills?${q}`);
      if (!r.ok) throw new Error("Gagal muat tagihan");
      return (await r.json()) as Bill[];
    },
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      if (!r.ok) throw new Error("Gagal muat pengaturan");
      return (await r.json()) as { ownerName: string };
    },
  });
  const ownerName = settings.data?.ownerName || "Owner";

  const voidPay = useMutation({
    mutationFn: async (paymentId: string) => {
      const r = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal void");
      return j;
    },
    onSuccess: () => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Pembayaran dibatalkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delBill = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal hapus");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Tagihan dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function waTagih(b: Bill) {
    const late = daysLate(b.dueDate);
    const text = late > 0
      ? telatText({ tenantName: b.tenant.name, unitCode: `${b.unit.property.name} ${b.unit.code}`, periodLabel: periodLabel(b.period), amount: b.amount, lateDays: late, ownerName })
      : tagihText({ tenantName: b.tenant.name, unitCode: b.unit.code, propertyName: b.unit.property.name, periodLabel: periodLabel(b.period), amount: b.amount, dueDate: b.dueDate, ownerName });
    window.open(waLink(b.tenant.phoneWa, text), "_blank");
    toast.success("Template WA dibuka");
  }

  const sel = (bills.data ?? []).filter((b) => selected.includes(b.id));
  const selPayable = sel.filter((b) => b.remaining > 0);
  const selBilled = sel.filter((b) => b.paidTotal > 0);

  const all = bills.data ?? [];
  const pages = Math.max(1, Math.ceil(all.length / BILL_PER_PAGE));
  const safePage = Math.min(billPage, pages);
  const pageBills = all.slice((safePage - 1) * BILL_PER_PAGE, safePage * BILL_PER_PAGE);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="month" value={billPeriod} onChange={(e) => { setBillPeriod(e.target.value); setBillPage(1); }} className="w-40" />
        <div className="w-36">
          <FieldSelect
            value={billStatus}
            options={[
              { value: "all", label: "Semua" },
              { value: "unpaid", label: "Belum bayar" },
              { value: "partial", label: "Nyicil/sebagian" },
              { value: "overdue", label: "Overdue" },
              { value: "paid", label: "Lunas" },
            ]}
            onChange={(v) => { setBillStatus(v); setBillPage(1); }}
          />
        </div>
        <Button size="sm" onClick={() => openSheet("generate")}>Generate</Button>
      </div>
      {sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
          <span className="text-muted-foreground">{sel.length} dipilih</span>
          {selPayable.length > 0 && (
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              Bayar {selPayable.length} tagihan
            </Button>
          )}
          {selBilled.length >= 2 && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/tagihan/invoice?ids=${selBilled.map((b) => b.id).join(",")}`, "_blank")}>
              Invoice gabungan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Batal</Button>
        </div>
      )}
      {pageBills.map((b) => (
        <Card key={b.id} className={b.computedStatus === "overdue" ? "border-destructive" : ""}>
          <CardContent className="flex flex-col gap-2 pt-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                {b.remaining > 0 && (
                  <input
                    type="checkbox" className="mt-1 h-4 w-4 accent-primary"
                    checked={selected.includes(b.id)}
                    onChange={(e) => setSelected((s) => e.target.checked ? [...s, b.id] : s.filter((id) => id !== b.id))}
                    aria-label={`Pilih ${periodLabel(b.period)}`}
                  />
                )}
                <div>
                  <p className="font-medium">{b.tenant.name} · {b.unit.property.name} {b.unit.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {periodLabel(b.period)} · jatuh tempo {formatDateID(b.dueDate)} · {formatIDR(b.amount)}
                    {b.paidTotal > 0 && ` · dibayar ${formatIDR(b.paidTotal)}`}
                  </p>
                </div>
              </div>
              <Badge variant={b.computedStatus === "paid" ? "outline" : b.computedStatus === "overdue" ? "destructive" : "secondary"}>
                {b.computedStatus === "paid"
                  ? "Lunas"
                  : b.computedStatus === "partial"
                    ? `Nyicil · sisa ${formatIDR(b.remaining)}`
                    : b.computedStatus === "overdue" ? `Telat H+${b.lateDays}` : "Belum bayar"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {b.remaining > 0 ? (
                <>
                  <Button size="sm" onClick={() => openSheet("pay", b.id)}>
                    {b.paidTotal > 0 ? "Bayar sisa" : "Bayar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => waTagih(b)}>WA tagih</Button>
                  {b.payments.length === 0 && (
                    <Button size="sm" variant="ghost" onClick={() => delBill.mutate(b.id)}>Hapus</Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/tagihan/${b.id}/invoice`, "_blank")}>Invoice</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    window.open(waLink(b.tenant.phoneWa, lunasText({ tenantName: b.tenant.name, unitCode: b.unit.code, periodLabel: periodLabel(b.period), amount: b.amount, ownerName })), "_blank");
                    toast.success("Template lunas dibuka");
                  }}>WA lunas</Button>
                </>
              )}
            </div>
            {b.payments.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2 text-xs">
                {b.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span>
                      {formatDateID(p.paidAt)} · {formatIDR(p.amount)} ({p.method})
                      {p.proofPath && (
                        <> · <a href={`/api/files/${p.proofPath}`} target="_blank" className="underline">bukti</a></>
                      )}
                    </span>
                    <Button
                      size="sm" variant="ghost" className="h-6 px-2 text-xs"
                      disabled={voidPay.isPending}
                      onClick={() => {
                        if (window.confirm(`Batalkan pembayaran ${formatIDR(p.amount)}?`)) voidPay.mutate(p.id);
                      }}
                    >
                      Void
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setBillPage(safePage - 1)}>
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">{safePage} / {pages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= pages} onClick={() => setBillPage(safePage + 1)}>
            Next →
          </Button>
        </div>
      )}
      {bills.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tagihan periode ini. Generate dulu.</p>}

      <GenerateDialog />
      <PayDialog bill={(() => {
        const b = (bills.data ?? []).find((x) => x.id === billId);
        return b ? { id: b.id, amount: b.amount, remaining: b.remaining } : null;
      })()} />
      <BulkPayDialog
        open={bulkOpen}
        bills={(bills.data ?? []).filter((b) => selected.includes(b.id) && b.remaining > 0)}
        onClose={() => { setBulkOpen(false); setSelected([]); }}
      />
    </>
  );
}
