"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/store";
import { formatIDR, formatDateID, periodLabel } from "@/lib/format";

type Hist = {
  id: string; active: boolean; startDate: string; endDate: string | null; monthlyPriceSnapshot: number;
  unit: { code: string; property: { name: string } };
  tenant: { name: string; phoneWa: string };
  bills: { id: string; period: string; amount: string | number; dueDate: string; payment: { method: string } | null }[];
};

// Drawer riwayat huni 1 penghuni: unit mana, periode, tagihan + status lunas
export function HistorySheet() {
  const { sheet, editId: tenantId, closeSheet } = useUI();
  const open = sheet === "history" && !!tenantId;
  const { data } = useQuery({
    queryKey: ["history", tenantId],
    queryFn: async () => (await fetch(`/api/leases?tenantId=${tenantId}`).then((r) => r.json())) as Hist[],
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Riwayat huni</SheetTitle></SheetHeader>
        <div className="mt-4 flex flex-col gap-3">
          {(data ?? []).map((h) => (
            <div key={h.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{h.unit.property.name} · {h.unit.code}</p>
                <Badge variant={h.active ? "default" : "secondary"}>{h.active ? "Aktif" : "Selesai"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateID(h.startDate)} → {h.endDate ? formatDateID(h.endDate) : "sekarang"} · {formatIDR(h.monthlyPriceSnapshot)}/bln
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {h.bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-xs">
                    <span>{periodLabel(b.period)} · {formatIDR(Number(b.amount))}</span>
                    <Badge variant={b.payment ? "outline" : "destructive"}>{b.payment ? `Lunas ${b.payment.method}` : "Belum"}</Badge>
                  </div>
                ))}
                {h.bills.length === 0 && <p className="text-xs text-muted-foreground">Belum ada tagihan.</p>}
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Tidak ada riwayat.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
