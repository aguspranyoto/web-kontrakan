"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { tenantSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/store";

type In = z.input<typeof tenantSchema>;
type Out = z.output<typeof tenantSchema>;

export function TenantSheet() {
  const { sheet, editId, closeSheet } = useUI();
  const open = sheet === "tenant-form";
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<In, unknown, Out>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { name: "", phoneWa: "", idNumber: "", emergencyContact: "", note: "" },
  });

  const list = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => (await fetch("/api/tenants").then((r) => r.json())) as { id: string; name: string; phoneWa: string; idNumber: string; emergencyContact: string; note: string }[],
    enabled: open && !!editId,
  });
  useEffect(() => {
    if (open && editId) {
      const t = list.data?.find((x) => x.id === editId);
      if (t) reset({ name: t.name, phoneWa: t.phoneWa, idNumber: t.idNumber ?? "", emergencyContact: t.emergencyContact ?? "", note: t.note ?? "" });
    } else if (open && !editId) {
      reset({ name: "", phoneWa: "", idNumber: "", emergencyContact: "", note: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, list.data]);

  const mut = useMutation({
    mutationFn: async (v: Out) => {
      const url = editId ? `/api/tenants/${editId}` : "/api/tenants";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan penghuni");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(editId ? "Penghuni diperbarui" : "Penghuni tersimpan");
      reset();
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tenants/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal hapus");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Penghuni dihapus");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>{editId ? "Ubah penghuni" : "Tambah penghuni"}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="t-name">Nama yg ngontrak *</Label>
            <Input id="t-name" placeholder="Nama lengkap" {...register("name")} />
            {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-wa">No. telp / WA *</Label>
            <Input id="t-wa" inputMode="tel" placeholder="0812..." {...register("phoneWa")} />
            {formState.errors.phoneWa && <p className="text-sm text-destructive">{formState.errors.phoneWa.message}</p>}
            <p className="text-xs text-muted-foreground">Otomatis dinormalisasi 08xx → 62xx.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-id">NIK / KTP (opsional)</Label>
            <Input id="t-id" {...register("idNumber")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-emg">Kontak darurat (opsional)</Label>
            <Input id="t-emg" {...register("emergencyContact")} />
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Menyimpan..." : editId ? "Simpan perubahan" : "Simpan penghuni"}
          </Button>
          {editId && (
            <Button type="button" variant="destructive" disabled={del.isPending} onClick={() => {
              if (confirm("Hapus penghuni ini? Hanya bisa bila tidak sedang menghuni.")) del.mutate();
            }}>
              {del.isPending ? "Menghapus..." : "Hapus penghuni"}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
