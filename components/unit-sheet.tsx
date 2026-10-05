"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { unitSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/components/field-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/lib/store";
import { formatIDR } from "@/lib/format";

type In = z.input<typeof unitSchema>;
type Out = z.output<typeof unitSchema>;

export function UnitSheet() {
  const { sheet, editId, closeSheet } = useUI();
  const open = sheet === "unit-form";
  const qc = useQueryClient();
  const props = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await fetch("/api/properties").then((r) => r.json())) as { id: string; name: string }[],
    enabled: open,
  });
  const units = useQuery({
    queryKey: ["units"],
    queryFn: async () => (await fetch("/api/units").then((r) => r.json())) as { id: string; code: string; monthlyPrice: number; status: string; propertyId: string; note: string }[],
    enabled: open && !!editId,
  });
  const [propId, setPropId] = useState("");
  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<In, unknown, Out>({
    resolver: zodResolver(unitSchema),
    defaultValues: { propertyId: "", code: "", monthlyPrice: 0, status: "VACANT", note: "" },
  });

  useEffect(() => {
    if (open && editId) {
      const u = units.data?.find((x) => x.id === editId);
      if (u) reset({ propertyId: u.propertyId, code: u.code, monthlyPrice: u.monthlyPrice, status: u.status as Out["status"], note: u.note ?? "" });
    } else if (open && !editId) {
      reset({ propertyId: "", code: "", monthlyPrice: 0, status: "VACANT", note: "" });
      setPropId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, units.data]);

  const mut = useMutation({
    mutationFn: async (v: Out) => {
      const url = editId ? `/api/units/${editId}` : "/api/units";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan unit");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["units"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success(editId ? "Unit diperbarui" : "Unit tersimpan");
      reset();
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/units/${editId}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal hapus");
      return j;
    },
    onSuccess: () => {
      ["units", "properties"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Unit dihapus");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>{editId ? "Ubah unit" : "Tambah unit / pintu"}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="mt-4 flex flex-col gap-3">
          {!editId && (
            <div className="grid gap-1.5">
              <Label>Kontrakan</Label>
              <FieldSelect
                value={propId}
                placeholder="Pilih kontrakan"
                options={(props.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
                onChange={(v) => { setPropId(v); setValue("propertyId", v); }}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="u-code">Kode unit (cth. A1)</Label>
            <Input id="u-code" {...register("code")} />
            {formState.errors.code && <p className="text-sm text-destructive">{formState.errors.code.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-price">Harga / bulan (Rp)</Label>
            <Input id="u-price" type="number" min={0} {...register("monthlyPrice")} />
            <p className="text-xs text-muted-foreground">{formatIDR(Number(watch("monthlyPrice") || 0))} — hanya untuk tagihan baru, yg lama tidak berubah</p>
          </div>
          {editId && (
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <FieldSelect
                value={String(watch("status") ?? "VACANT")}
                options={[
                  { value: "VACANT", label: "Kosong" },
                  { value: "MAINTENANCE", label: "Rusak / renovasi" },
                  { value: "OCCUPIED", label: "Terisi (otomatis — jangan manual)" },
                ]}
                onChange={(v) => setValue("status", (v as Out["status"]) ?? "VACANT")}
              />
            </div>
          )}
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Menyimpan..." : editId ? "Simpan perubahan" : "Simpan unit"}
          </Button>
          {editId && (
            <Button type="button" variant="destructive" disabled={del.isPending} onClick={() => {
              if (confirm("Hapus unit ini? Hanya bisa bila belum ada riwayat tagihan.")) del.mutate();
            }}>
              {del.isPending ? "Menghapus..." : "Hapus unit"}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
