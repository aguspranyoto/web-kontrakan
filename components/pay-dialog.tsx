"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUI } from "@/lib/store";

// Dialog bayar CASH/TRANSFER + upload bukti (wajib TRANSFER, max 2MB)
export function PayDialog({ billAmount }: { billAmount: number }) {
  const { sheet, billId, closeSheet } = useUI();
  const open = sheet === "pay" && !!billId;
  const qc = useQueryClient();
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("TRANSFER");
  const [amount, setAmount] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.set("method", method);
      fd.set("amount", amount || String(billAmount));
      if (file) fd.set("file", file);
      const r = await fetch(`/api/bills/${billId}/pay`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan pembayaran");
      return j;
    },
    onSuccess: () => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Pembayaran lunas tersimpan");
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
          <div className="grid grid-cols-2 gap-2">
            {(["CASH", "TRANSFER"] as const).map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                {m === "CASH" ? "Cash" : "Transfer"}
              </Button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label>Nominal (Rp)</Label>
            <Input type="number" min={1} placeholder={String(billAmount)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {method === "TRANSFER" && (
            <div className="grid gap-1.5">
              <Label>Bukti transfer * (JPG/PNG/WebP, max 2MB)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && file.size > 2097152 && <p className="text-sm text-destructive">File &gt;2MB — pilih yg lebih kecil.</p>}
            </div>
          )}
          <Button disabled={mut.isPending} className="w-full" onClick={() => mut.mutate()}>
            {mut.isPending ? "Menyimpan..." : "Simpan lunas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
