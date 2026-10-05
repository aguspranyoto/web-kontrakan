"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

type Settings = { email: string; ownerName: string; defaultDueDay: string; backupLastOk: string | null };

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await fetch("/api/settings").then((r) => r.json())) as Settings,
  });

  const { register: reg1, handleSubmit: hs1, reset: reset1 } = useForm({ defaultValues: { ownerName: "", defaultDueDay: "5" } });
  useEffect(() => {
    if (data) reset1({ ownerName: data.ownerName, defaultDueDay: data.defaultDueDay });
  }, [data, reset1]);

  const save = useMutation({
    mutationFn: async (v: { ownerName: string; defaultDueDay: number }) => {
      const r = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal simpan");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Pengaturan tersimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { register: reg2, handleSubmit: hs2, reset: reset2, formState: fs2 } = useForm({
    defaultValues: { oldPassword: "", newPassword: "" },
  });
  const pw = useMutation({
    mutationFn: async (v: { oldPassword: string; newPassword: string }) => {
      const r = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal ganti password");
      return j;
    },
    onSuccess: () => {
      reset2();
      toast.success("Password diganti");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-3 pb-20 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <Link href="/" className="text-xs text-muted-foreground underline">← Kembali</Link>
          <h1 className="text-lg font-bold">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">{data?.email ?? ""}</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Profil & default tagihan</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={hs1((v) => save.mutate({ ownerName: v.ownerName, defaultDueDay: Number(v.defaultDueDay) }))} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label>Nama owner (utk template WA & invoice)</Label>
              <Input {...reg1("ownerName")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tanggal jatuh tempo default (1–28)</Label>
              <Input type="number" min={1} max={28} {...reg1("defaultDueDay")} />
            </div>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ganti password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={hs2((v) => pw.mutate(v))} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label>Password lama</Label>
              <Input type="password" {...reg2("oldPassword")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Password baru (min 6)</Label>
              <Input type="password" {...reg2("newPassword")} />
              {fs2.errors.newPassword && <p className="text-sm text-destructive">Minimal 6 karakter</p>}
            </div>
            <Button type="submit" disabled={pw.isPending}>{pw.isPending ? "Menyimpan..." : "Ganti password"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className={data?.backupLastOk ? "" : "border-destructive"}>
        <CardHeader><CardTitle className="text-base">Backup Google Drive</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {data?.backupLastOk ? (
            <p>Terakhir sukses: <span className="font-medium">{data.backupLastOk}</span></p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-bold text-destructive">BELUM PERNAH backup — config GDrive belum diisi!</p>
              <p className="text-muted-foreground">Ikuti checklist di PRD §14 / backup/README.md: rclone config → isi rclone.conf → up service backup.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
