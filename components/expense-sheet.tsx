"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { expenseSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/components/field-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/store";

type In = z.input<typeof expenseSchema>;
type Out = z.output<typeof expenseSchema>;
const CATS = ["Servis", "Listrik bersama", "Air", "Pajak", "Kebersihan", "Lainnya"];

export function ExpenseSheet() {
  const { sheet, closeSheet } = useUI();
  const open = sheet === "expense-form";
  const qc = useQueryClient();
  const props = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await fetch("/api/properties").then((r) => r.json())) as { id: string; name: string }[],
    enabled: open,
  });
  const [cat, setCat] = useState("Lainnya");
  const [propId, setPropId] = useState("-");
  const { register, handleSubmit, reset, setValue } = useForm<In, unknown, Out>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "Lainnya", amount: 1, note: "" },
  });

  const mut = useMutation({
    mutationFn: async (v: Out) => {
      const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan");
      return j;
    },
    onSuccess: () => {
      ["expenses", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Pengeluaran tersimpan");
      reset();
      setCat("Lainnya");
      setPropId("-");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Catat pengeluaran</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label>Tanggal</Label>
            <Input type="date" {...register("date")} />
          </div>
          <div className="grid gap-1.5">
            <Label>Kategori</Label>
            <FieldSelect
              value={cat}
              options={CATS.map((c) => ({ value: c, label: c }))}
              onChange={(v) => { setCat(v); setValue("category", v); }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Kontrakan (opsional)</Label>
            <FieldSelect
              value={propId}
              placeholder="Semua / bersama"
              options={[{ value: "-", label: "Semua / bersama" }, ...((props.data ?? []).map((p) => ({ value: p.id, label: p.name })))]}
              onChange={(v) => { setPropId(v); setValue("propertyId", v === "-" ? null : v); }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Nominal (Rp)</Label>
            <Input type="number" min={1} {...register("amount")} />
          </div>
          <div className="grid gap-1.5">
            <Label>Catatan</Label>
            <Input {...register("note")} placeholder="Benerin atap bocor" />
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
