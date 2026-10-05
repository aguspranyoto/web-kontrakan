"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { propertySchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/store";

type FormInput = z.input<typeof propertySchema>;
type FormOutput = z.output<typeof propertySchema>;

export function PropertySheet() {
  const { sheet, editId, closeSheet } = useUI();
  const open = sheet === "property-form";
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(propertySchema),
    defaultValues: { name: "", address: "", note: "" },
  });

  // mode edit: preload data properti
  const existing = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await fetch("/api/properties").then((r) => r.json())) as { id: string; name: string; address: string; note: string }[],
    enabled: open && !!editId,
  });
  useEffect(() => {
    if (open && editId) {
      const p = existing.data?.find((x) => x.id === editId);
      if (p) reset({ name: p.name, address: p.address, note: p.note });
    } else if (open && !editId) {
      reset({ name: "", address: "", note: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, existing.data]);

  const mut = useMutation({
    mutationFn: async (v: FormOutput) => {
      const url = editId ? `/api/properties/${editId}` : "/api/properties";
      const r = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success(editId ? "Kontrakan diperbarui" : "Properti tersimpan");
      reset();
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/properties/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal hapus");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Kontrakan dihapus");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editId ? "Ubah kontrakan" : "Tambah kontrakan"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Nama kontrakan</Label>
            <Input id="p-name" placeholder="Kontrakan Obos 102" {...register("name")} />
            {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-addr">Alamat</Label>
            <Textarea id="p-addr" rows={2} {...register("address")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-note">Catatan</Label>
            <Textarea id="p-note" rows={2} {...register("note")} />
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Menyimpan..." : editId ? "Simpan perubahan" : "Simpan"}
          </Button>
          {editId && (
            <Button type="button" variant="destructive" disabled={del.isPending} onClick={() => {
              if (confirm("Hapus kontrakan ini? Hanya bisa bila sudah tidak ada unit.")) del.mutate();
            }}>
              {del.isPending ? "Menghapus..." : "Hapus kontrakan"}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
