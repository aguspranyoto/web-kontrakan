"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { checkinSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/components/field-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUI } from "@/lib/store";

type In = z.input<typeof checkinSchema>;
type Out = z.output<typeof checkinSchema>;

export function CheckinDialog() {
  const { sheet, closeSheet } = useUI();
  const open = sheet === "checkin";
  const qc = useQueryClient();
  const units = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await fetch("/api/units").then((r) => r.json())) as { id: string; code: string; status: string; monthlyPrice: number; property: { name: string } }[],
    enabled: open,
  });
  const tenants = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => (await fetch("/api/tenants").then((r) => r.json())) as { id: string; name: string }[],
    enabled: open,
  });
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const { handleSubmit, setValue, watch, register, reset } = useForm<In, unknown, Out>({
    resolver: zodResolver(checkinSchema),
    defaultValues: { unitId: "", tenantId: "", startDate: new Date() as unknown as Date, monthlyPriceSnapshot: 0, deposit: 0 },
  });

  const mut = useMutation({
    mutationFn: async (v: Out) => {
      const r = await fetch("/api/leases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal check-in");
      return j;
    },
    onSuccess: () => {
      ["units", "tenants", "leases", "bills"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Penghuni ditempatkan ke unit");
      setUnitId("");
      setTenantId("");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeSheet()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tempatkan penghuni ke unit</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label>Unit kosong</Label>
            <FieldSelect
              value={unitId}
              placeholder="Pilih unit"
              options={(units.data ?? []).filter((u) => u.status === "VACANT").map((u) => ({ value: u.id, label: `${u.property.name} · ${u.code}` }))}
              onChange={(uid) => {
                setUnitId(uid);
                setValue("unitId", uid);
                const u = units.data?.find((x) => x.id === uid);
                if (u) setValue("monthlyPriceSnapshot", u.monthlyPrice as unknown as In["monthlyPriceSnapshot"]);
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Penghuni</Label>
            <FieldSelect
              value={tenantId}
              placeholder="Pilih penghuni"
              options={(tenants.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
              onChange={(v) => { setTenantId(v); setValue("tenantId", v); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tgl masuk</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Harga deal (Rp)</Label>
              <Input type="number" min={0} {...register("monthlyPriceSnapshot")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Unit terisi: {String(watch("unitId") ?? "") ? "ya" : "-"} · Harga: {String(watch("monthlyPriceSnapshot") ?? "")}</p>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Menyimpan..." : "Check-in"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
