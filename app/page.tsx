"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/field-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";
import { Settings } from "lucide-react";
import { PropertySheet } from "@/components/property-sheet";
import { UnitSheet } from "@/components/unit-sheet";
import { TenantSheet } from "@/components/tenant-sheet";
import { HistorySheet } from "@/components/history-sheet";
import { CheckinDialog } from "@/components/checkin-dialog";
import { GenerateDialog } from "@/components/generate-dialog";
import { PayDialog } from "@/components/pay-dialog";
import { ExpenseSheet } from "@/components/expense-sheet";
import { useUI } from "@/lib/store";
import { formatIDR, formatDateID, periodLabel, daysLate } from "@/lib/format";
import { waLink, tagihText, telatText, lunasText } from "@/lib/wa";

type Lease = {
  id: string;
  unit: { id: string; code: string; property: { name: string } };
  tenant: { id: string; name: string; phoneWa: string };
};

type Bill = {
  id: string; period: string; amount: number; dueDate: string; note: string;
  computedStatus: "paid" | "unpaid" | "overdue"; lateDays: number;
  unit: { code: string; property: { name: string } };
  tenant: { name: string; phoneWa: string };
  payment: { method: string; paidAt: string; proofPath: string; amount: number } | null;
};

type Dash = {
  month: string; totalUnits: number; occupied: number; vacant: number;
  income: number; outcome: number; balance: number;
  overdueCount: number; overdueNominal: number;
  overdue: { id: string; period: string; amount: number; dueDate: string; lateDays: number; tenant: string; phoneWa: string; unit: string; property: string }[];
  dueSoon: { id: string; period: string; amount: number; dueDate: string; tenant: string; unit: string; property: string }[];
};

const thisMonth = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

export default function Home() {
  const { tab, setTab, openSheet } = useUI();
  const qc = useQueryClient();
  const [billPeriod, setBillPeriod] = useState(thisMonth());
  const [billStatus, setBillStatus] = useState("all");
  const [payAmount, setPayAmount] = useState(0);

  const props = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const r = await fetch("/api/properties");
      if (!r.ok) throw new Error("Gagal muat properti");
      return (await r.json()) as { id: string; name: string; address: string; _count: { units: number } }[];
    },
  });
  const units = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const r = await fetch("/api/units");
      if (!r.ok) throw new Error("Gagal muat unit");
      return (await r.json()) as { id: string; code: string; monthlyPrice: number; status: string; propertyId: string; property: { name: string } }[];
    },
    enabled: tab === "properti" || tab === "penghuni",
  });
  const tenants = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const r = await fetch("/api/tenants");
      if (!r.ok) throw new Error("Gagal muat penghuni");
      return (await r.json()) as { id: string; name: string; phoneWa: string; leases: { unit: { code: string; property: { name: string } } }[] }[];
    },
    enabled: tab === "penghuni",
  });
  const leases = useQuery({
    queryKey: ["leases"],
    queryFn: async () => {
      const r = await fetch("/api/leases");
      if (!r.ok) throw new Error("Gagal muat hunian");
      return (await r.json()) as Lease[];
    },
    enabled: tab === "penghuni",
  });
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Gagal muat dashboard");
      return (await r.json()) as Dash;
    },
    enabled: tab === "dashboard",
  });
  const bills = useQuery({
    queryKey: ["bills", billPeriod, billStatus],
    queryFn: async () => {
      const q = new URLSearchParams({ period: billPeriod });
      if (billStatus !== "all") q.set("status", billStatus);
      const r = await fetch(`/api/bills?${q}`);
      if (!r.ok) throw new Error("Gagal muat tagihan");
      return (await r.json()) as Bill[];
    },
    enabled: tab === "tagihan",
  });
  const expenses = useQuery({
    queryKey: ["expenses", billPeriod],
    queryFn: async () => {
      const r = await fetch(`/api/expenses?month=${billPeriod}`);
      if (!r.ok) throw new Error("Gagal muat kas");
      return (await r.json()) as { id: string; date: string; category: string; amount: number; note: string; property: { name: string } | null }[];
    },
    enabled: tab === "kas",
  });

  const checkout = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/leases/${id}/checkout`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal checkout");
      return j;
    },
    onSuccess: () => {
      ["leases", "units", "tenants"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Penghuni di-checkout, unit jadi kosong");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const voidPay = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/bills/${id}/void`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal void");
      return j;
    },
    onSuccess: () => {
      ["bills", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Pembayaran dibatalkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delBill = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Gagal hapus");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Tagihan dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function waTagih(b: Bill) {
    const late = daysLate(b.dueDate);
    const text = late > 0
      ? telatText({ tenantName: b.tenant.name, unitCode: `${b.unit.property.name} ${b.unit.code}`, periodLabel: periodLabel(b.period), amount: b.amount, lateDays: late, ownerName: "Owner" })
      : tagihText({ tenantName: b.tenant.name, unitCode: b.unit.code, propertyName: b.unit.property.name, periodLabel: periodLabel(b.period), amount: b.amount, dueDate: b.dueDate, ownerName: "Owner" });
    window.open(waLink(b.tenant.phoneWa, text), "_blank");
    toast.success("Template WA dibuka");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-3 pb-20 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">web-kontrakan</h1>
          <p className="text-xs text-muted-foreground">Kelola penghuni + monitor bayar bulanan</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/pengaturan" aria-label="Pengaturan" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
            <Settings className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Home</TabsTrigger>
          <TabsTrigger value="properti">Unit</TabsTrigger>
          <TabsTrigger value="penghuni">Penghuni</TabsTrigger>
          <TabsTrigger value="tagihan">Tagihan</TabsTrigger>
          <TabsTrigger value="kas">Kas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="flex flex-col gap-3">
          {dash.data && dash.data.overdueCount > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-4 text-sm">
                <p className="font-bold text-destructive">
                  {dash.data.overdueCount} tagihan OVERDUE {formatIDR(dash.data.overdueNominal)}
                </p>
                <Button size="sm" className="mt-2" onClick={() => setTab("tagihan")}>Lihat tunggakan</Button>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Unit", `${dash.data?.occupied ?? "-"}/${dash.data?.totalUnits ?? "-"}`],
              ["Masuk bln ini", dash.data ? formatIDR(dash.data.income) : "-"],
              ["Keluar bln ini", dash.data ? formatIDR(dash.data.outcome) : "-"],
            ].map(([l, v]) => (
              <Card key={l}><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{l}</p><p className="text-sm font-bold">{v}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Jatuh tempo ≤7 hari</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {(dash.data?.dueSoon ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <span>{d.tenant} · {d.property} {d.unit} · {formatIDR(d.amount)}</span>
                  <Badge variant="secondary">{formatDateID(d.dueDate)}</Badge>
                </div>
              ))}
              {(dash.data?.dueSoon ?? []).length === 0 && <p className="text-muted-foreground">Tidak ada.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Tunggakan (overdue)</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {(dash.data?.overdue ?? []).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <span>{o.tenant} · {o.property} {o.unit} · H+{o.lateDays}</span>
                  <Badge variant="destructive">{formatIDR(o.amount)}</Badge>
                </div>
              ))}
              {(dash.data?.overdue ?? []).length === 0 && <p className="text-muted-foreground">Aman, tidak ada tunggakan.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properti" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Kontrakan & unit</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openSheet("unit-form")}>+ Unit</Button>
              <Button size="sm" onClick={() => openSheet("property-form")}>+ Kontrakan</Button>
            </div>
          </div>
          {(props.data ?? []).map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{p.name}</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{p.address || "-"} · {p._count.units} unit</span>
                <Button size="sm" variant="outline" onClick={() => openSheet("property-form", undefined, p.id)}>Ubah</Button>
              </CardContent>
            </Card>
          ))}
          {props.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kontrakan.</p>}
          {(units.data ?? []).map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between gap-2 pt-4 text-sm">
                <div>
                  <p className="font-medium">{u.property.name} · {u.code}</p>
                  <p className="text-xs text-muted-foreground">{formatIDR(u.monthlyPrice)}/bln</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.status === "OCCUPIED" ? "default" : u.status === "MAINTENANCE" ? "destructive" : "secondary"}>
                    {u.status === "OCCUPIED" ? "Terisi" : u.status === "MAINTENANCE" ? "Rusak" : "Kosong"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => openSheet("unit-form", undefined, u.id)}>Ubah</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="penghuni" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Penghuni</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openSheet("checkin")}>Check-in</Button>
              <Button size="sm" onClick={() => openSheet("tenant-form")}>+ Penghuni</Button>
            </div>
          </div>
          {(leases.data ?? []).map((l) => (
            <Card key={l.id}>
              <CardContent className="flex items-center justify-between gap-2 pt-4 text-sm">
                <div>
                  <p className="font-medium">{l.tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{l.unit.property.name} · {l.unit.code} · {l.tenant.phoneWa}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openSheet("history", undefined, l.tenant.id)}>Riwayat</Button>
                  <Button size="sm" variant="outline" disabled={checkout.isPending} onClick={() => checkout.mutate(l.id)}>Checkout</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(tenants.data ?? []).filter((t) => t.leases.length === 0).map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-2 pt-4 text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.phoneWa} · belum menghuni</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openSheet("history", undefined, t.id)}>Riwayat</Button>
                  <Button size="sm" variant="ghost" onClick={() => openSheet("tenant-form", undefined, t.id)}>Ubah</Button>
                  <Button size="sm" variant="ghost" onClick={() => window.open(`https://wa.me/${t.phoneWa}`, "_blank")}>WA</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {tenants.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada penghuni.</p>}
        </TabsContent>

        <TabsContent value="tagihan" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" value={billPeriod} onChange={(e) => setBillPeriod(e.target.value)} className="w-40" />
            <div className="w-36">
              <FieldSelect
                value={billStatus}
                options={[
                  { value: "all", label: "Semua" },
                  { value: "unpaid", label: "Belum bayar" },
                  { value: "overdue", label: "Overdue" },
                  { value: "paid", label: "Lunas" },
                ]}
                onChange={setBillStatus}
              />
            </div>
            <Button size="sm" onClick={() => openSheet("generate")}>Generate</Button>
          </div>
          {(bills.data ?? []).map((b) => (
            <Card key={b.id} className={b.computedStatus === "overdue" ? "border-destructive" : ""}>
              <CardContent className="flex flex-col gap-2 pt-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{b.tenant.name} · {b.unit.property.name} {b.unit.code}</p>
                    <p className="text-xs text-muted-foreground">{periodLabel(b.period)} · jatuh tempo {formatDateID(b.dueDate)} · {formatIDR(b.amount)}</p>
                  </div>
                  <Badge variant={b.computedStatus === "paid" ? "outline" : b.computedStatus === "overdue" ? "destructive" : "secondary"}>
                    {b.computedStatus === "paid" ? "Lunas" : b.computedStatus === "overdue" ? `Telat H+${b.lateDays}` : "Belum bayar"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.computedStatus !== "paid" ? (
                    <>
                      <Button size="sm" onClick={() => { setPayAmount(b.amount); openSheet("pay", b.id); }}>Bayar</Button>
                      <Button size="sm" variant="outline" onClick={() => waTagih(b)}>WA tagih</Button>
                      <Button size="sm" variant="ghost" onClick={() => delBill.mutate(b.id)}>Hapus</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/tagihan/${b.id}/invoice`, "_blank")}>Invoice</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        window.open(waLink(b.tenant.phoneWa, lunasText({ tenantName: b.tenant.name, unitCode: b.unit.code, periodLabel: periodLabel(b.period), amount: b.amount, ownerName: "Owner" })), "_blank");
                        toast.success("Template lunas dibuka");
                      }}>WA lunas</Button>
                      <Button size="sm" variant="ghost" onClick={() => voidPay.mutate(b.id)}>Void</Button>
                    </>
                  )}
                </div>
                {b.payment?.proofPath && (
                  <a href={`/api/files/${b.payment.proofPath}`} target="_blank" className="text-xs text-muted-foreground underline">
                    Lihat bukti ({b.payment.method})
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
          {bills.data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tagihan periode ini. Generate dulu.</p>}
        </TabsContent>

        <TabsContent value="kas" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Kas {periodLabel(billPeriod)}</h2>
            <Button size="sm" onClick={() => openSheet("expense-form")}>+ Keluar</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Masuk", formatIDR((bills.data ?? []).filter((b) => b.computedStatus === "paid").reduce((s, b) => s + (b.payment?.amount ?? 0), 0))],
              ["Keluar", formatIDR((expenses.data ?? []).reduce((s, e) => s + e.amount, 0))],
              ["Saldo", formatIDR((bills.data ?? []).filter((b) => b.computedStatus === "paid").reduce((s, b) => s + (b.payment?.amount ?? 0), 0) - (expenses.data ?? []).reduce((s, e) => s + e.amount, 0))],
            ].map(([l, v]) => (
              <Card key={l}><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{l}</p><p className="text-sm font-bold">{v}</p></CardContent></Card>
            ))}
          </div>
          {(expenses.data ?? []).map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-2 pt-4 text-sm">
                <div>
                  <p className="font-medium">{e.category} · {formatIDR(e.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateID(e.date)} · {e.property?.name ?? "Bersama"} · {e.note}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(expenses.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengeluaran bulan ini.</p>}
          <Button variant="outline" onClick={() => {
            const rows = [["tanggal", "kategori", "properti", "nominal", "catatan"], ...((expenses.data ?? []).map((e) => [e.date, e.category, e.property?.name ?? "", String(e.amount), e.note]))];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            a.download = `kas-${billPeriod}.csv`;
            a.click();
            toast.success("CSV kas terunduh");
          }}>Export CSV</Button>
        </TabsContent>
      </Tabs>

      <PropertySheet />
      <UnitSheet />
      <TenantSheet />
      <HistorySheet />
      <CheckinDialog />
      <GenerateDialog />
      <PayDialog billAmount={payAmount} />
      <ExpenseSheet />
    </main>
  );
}
