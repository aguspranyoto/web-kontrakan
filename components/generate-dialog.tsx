"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/components/field-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUI } from "@/lib/store";

export function GenerateDialog() {
  const { sheet, closeSheet } = useUI();
  const open = sheet === "generate";
  const qc = useQueryClient();
  const props = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await fetch("/api/properties").then((r) => r.json())) as { id: string; name: string }[],
    enabled: open,
  });
  const [propId, setPropId] = useState("");
  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: { propertyId: "", period: "", dueDate: "" },
  });

  const mut = useMutation({
    mutationFn: async (v: { propertyId: string; period: string; dueDate: string }) => {
      const r = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal generate");
      return j as { created: number; skipped: number };
    },
    onSuccess: (j) => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Tagihan dibuat: ${j.created} (lewati duplikat: ${j.skipped})`);
      setPropId("");
      reset();
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeSheet()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate tagihan bulanan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label>Kontrakan</Label>
            <FieldSelect
              value={propId}
              placeholder="Pilih kontrakan"
              options={(props.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => { setPropId(v); setValue("propertyId", v); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Periode</Label>
              <Input type="month" defaultValue={thisMonth} {...register("period", { required: true })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Jatuh tempo</Label>
              <Input type="date" {...register("dueDate", { required: true })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">1 tagihan per unit terisi. Generate ulang periode sama tidak duplikat.</p>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Membuat..." : "Generate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
