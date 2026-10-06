"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUI } from "@/lib/store";
import { formatIDR } from "@/lib/format";

export type PayBill = { id: string; amount: number; remaining: number };

// Dialog bayar CASH/TRANSFER + upload bukti (wajib TRANSFER, max 2MB).
// Nominal custom max = sisa (boleh nyicil, TF selalu pas).
export function PayDialog({ bill }: { bill: PayBill | null }) {
  const { sheet, closeSheet } = useUI();
  const open = sheet === "pay" && !!bill;
  const qc = useQueryClient();
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("TRANSFER");
  const [amount, setAmount] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setFile(null);
      setMethod("TRANSFER");
    }
  }, [open, bill?.id]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!bill) throw new Error("Tagihan tidak dipilih");
      const nominal = Number(amount || String(bill.remaining));
      if (!Number.isInteger(nominal) || nominal < 1) throw new Error("Nominal tidak valid");
      if (nominal > bill.remaining) throw new Error(`Nominal melebihi sisa (${formatIDR(bill.remaining)})`);
      const fd = new FormData();
      fd.set("method", method);
      fd.set("amount", String(nominal));
      if (file) fd.set("file", file);
      const r = await fetch(`/api/bills/${bill.id}/pay`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan pembayaran");
      return { j, nominal };
    },
    onSuccess: ({ nominal }) => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(
        bill && nominal >= bill.remaining ? "Pembayaran lunas tersimpan" : `Cicilan ${formatIDR(nominal)} tersimpan`,
      );
      setFile(null);
      setAmount("");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeSheet()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Input pembayaran</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          {bill && (
            <p className="text-sm text-muted-foreground">
              Tagihan {formatIDR(bill.amount)} · Sisa {formatIDR(bill.remaining)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(["CASH", "TRANSFER"] as const).map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                {m === "CASH" ? "Cash" : "Transfer"}
              </Button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label>Nominal (Rp) — max sisa, boleh kurang (nyicil)</Label>
            <Input
              type="number" min={1} max={bill?.remaining ?? undefined}
              placeholder={bill ? String(bill.remaining) : ""}
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {method === "TRANSFER" && (
            <div className="grid gap-1.5">
              <Label>Bukti transfer * (JPG/PNG/WebP, max 2MB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && file.size > 2097152 && <p className="text-sm text-destructive">File &gt;2MB — pilih yg lebih kecil.</p>}
            </div>
          )}
          <Button disabled={mut.isPending} className="w-full" onClick={() => mut.mutate()}>
            {mut.isPending ? "Menyimpan..." : "Simpan pembayaran"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
