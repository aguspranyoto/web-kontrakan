"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatIDR, periodLabel } from "@/lib/format";

export type BulkBill = {
  id: string; period: string; amount: number; remaining: number;
  unit: { code: string; property: { name: string } };
};

// Dialog bayar banyak tagihan sekaligus (cth. Sept+Okt+Nov). Nominal per bulan
// default = sisa, bisa diubah (nyicil). 1 bukti dipakai bersama bila TRANSFER.
export function BulkPayDialog({ open, bills, onClose }: {
  open: boolean;
  bills: BulkBill[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("TRANSFER");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setAmounts(Object.fromEntries(bills.map((b) => [b.id, String(b.remaining)])));
      setFile(null);
      setMethod("TRANSFER");
    }
  }, [open, bills]);

  const total = useMemo(
    () => bills.reduce((s, b) => s + (Number(amounts[b.id]) || 0), 0),
    [bills, amounts],
  );

  const mut = useMutation({
    mutationFn: async () => {
      const items = bills.map((b) => {
        const nominal = Number(amounts[b.id] || String(b.remaining));
        if (!Number.isInteger(nominal) || nominal < 1)
          throw new Error(`Nominal ${periodLabel(b.period)} tidak valid`);
        if (nominal > b.remaining)
          throw new Error(`${periodLabel(b.period)} melebihi sisa (${formatIDR(b.remaining)})`);
        return { billId: b.id, amount: nominal };
      });
      const fd = new FormData();
      fd.set("items", JSON.stringify(items));
      fd.set("method", method);
      if (file) fd.set("file", file);
      const r = await fetch("/api/bills/pay-bulk", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan pembayaran");
      return j as { billIds: string[] };
    },
    onSuccess: (j) => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Pembayaran ${bills.length} tagihan tersimpan`);
      onClose();
      window.open(`/tagihan/invoice?ids=${j.billIds.join(",")}`, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Bayar {bills.length} tagihan sekaligus</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          {bills.map((b) => (
            <div key={b.id} className="grid gap-1.5 rounded-lg border p-2">
              <p className="text-sm font-medium">
                {b.unit.property.name} {b.unit.code} · {periodLabel(b.period)}
              </p>
              <p className="text-xs text-muted-foreground">Sisa {formatIDR(b.remaining)}</p>
              <Input
                type="number" min={1} max={b.remaining}
                value={amounts[b.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [b.id]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-sm font-bold">Total: {formatIDR(total)}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["CASH", "TRANSFER"] as const).map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                {m === "CASH" ? "Cash" : "Transfer"}
              </Button>
            ))}
          </div>
          {method === "TRANSFER" && (
            <div className="grid gap-1.5">
              <Label>Bukti transfer * (1 file dipakai bersama)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && file.size > 2097152 && <p className="text-sm text-destructive">File &gt;2MB — pilih yg lebih kecil.</p>}
            </div>
          )}
          <Button disabled={mut.isPending} className="w-full" onClick={() => mut.mutate()}>
            {mut.isPending ? "Menyimpan..." : `Simpan + buka invoice gabungan`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
