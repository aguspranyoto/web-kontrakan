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
import { BulkPayDialog } from "@/components/bulk-pay-dialog";
import { ExpenseSheet } from "@/components/expense-sheet";
import { useUI } from "@/lib/store";
import { formatIDR, formatDateID, periodLabel, daysLate } from "@/lib/format";
import { waLink, tagihText, telatText, lunasText } from "@/lib/wa";

type Lease = {
  id: string;
  unit: { id: string; code: string; property: { name: string } };
  tenant: { id: string; name: string; phoneWa: string };
};

type BillPayment = {
  id: string; amount: number; method: string; paidAt: string; proofPath: string;
};

type Bill = {
  id: string; period: string; amount: number; dueDate: string; note: string;
  computedStatus: "paid" | "partial" | "unpaid" | "overdue"; lateDays: number;
  paidTotal: number; remaining: number;
  unit: { code: string; property: { name: string } };
  tenant: { name: string; phoneWa: string };
  payments: BillPayment[];
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
  const { tab, setTab, openSheet, billId } = useUI();
  const qc = useQueryClient();
  const [billPeriod, setBillPeriod] = useState(thisMonth());
  const [billStatus, setBillStatus] = useState("all");
  const [selProp, setSelProp] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]); // tagihan terpilih utk bayar bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [unitPage, setUnitPage] = useState(1);
  const UNIT_PER_PAGE = 9;

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
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      if (!r.ok) throw new Error("Gagal muat pengaturan");
      return (await r.json()) as { ownerName: string };
    },
  });
  const ownerName = settings.data?.ownerName || "Owner";

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
    mutationFn: async (paymentId: string) => {
      const r = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
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
      ? telatText({ tenantName: b.tenant.name, unitCode: `${b.unit.property.name} ${b.unit.code}`, periodLabel: periodLabel(b.period), amount: b.amount, lateDays: late, ownerName })
      : tagihText({ tenantName: b.tenant.name, unitCode: b.unit.code, propertyName: b.unit.property.name, periodLabel: periodLabel(b.period), amount: b.amount, dueDate: b.dueDate, ownerName });
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
          {(() => {
            const propList = props.data ?? [];
            const activeProp = propList.find((p) => p.id === selProp) ?? propList[0] ?? null;
            const filteredUnits = (units.data ?? []).filter((u) => activeProp && u.propertyId === activeProp.id);
            const pages = Math.max(1, Math.ceil(filteredUnits.length / UNIT_PER_PAGE));
            const safePage = Math.min(unitPage, pages);
            const pageUnits = filteredUnits.slice((safePage - 1) * UNIT_PER_PAGE, safePage * UNIT_PER_PAGE);
            const pick = (id: string) => { setSelProp(id); setUnitPage(1); };
            return (
              <div className="grid gap-3 md:grid-cols-[280px_1fr]">
                {/* KIRI: list kontrakan 1 kolom */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Kontrakan</h2>
                    <Button size="sm" onClick={() => openSheet("property-form")}>+ Kontrakan</Button>
                  </div>
                  {propList.map((p) => {
                    const selected = activeProp?.id === p.id;
                    return (
                      <Card
                        key={p.id}
                        onClick={() => pick(p.id)}
                        className={`cursor-pointer transition-colors ${selected ? "border-primary ring-1 ring-primary" : ""}`}
                      >
                        <CardHeader className="pb-1">
                          <CardTitle className="text-base">{p.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{p.address || "-"} · {p._count.units} unit</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); openSheet("property-form", undefined, p.id); }}
                          >
                            Ubah
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {propList.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kontrakan.</p>}
                </div>
                {/* KANAN: grid unit kontrakan terpilih + pagination */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Unit{activeProp ? ` · ${activeProp.name}` : ""}</h2>
                    <Button size="sm" variant="outline" onClick={() => openSheet("unit-form")}>+ Unit</Button>
                  </div>
                  {filteredUnits.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {activeProp ? "Belum ada unit di kontrakan ini." : "Pilih kontrakan di kiri."}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {pageUnits.map((u) => (
                      <Card key={u.id}>
                        <CardContent className="flex flex-col gap-2 pt-4 text-sm">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-lg font-bold">{u.code}</p>
                            <Badge variant={u.status === "OCCUPIED" ? "default" : u.status === "MAINTENANCE" ? "destructive" : "secondary"}>
                              {u.status === "OCCUPIED" ? "Terisi" : u.status === "MAINTENANCE" ? "Rusak" : "Kosong"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatIDR(u.monthlyPrice)}/bln</p>
                          <Button size="sm" variant="ghost" className="w-full" onClick={() => openSheet("unit-form", undefined, u.id)}>
                            Ubah
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {pages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setUnitPage(safePage - 1)}>
                        ← Prev
                      </Button>
                      <span className="text-sm text-muted-foreground">{safePage} / {pages}</span>
                      <Button size="sm" variant="outline" disabled={safePage >= pages} onClick={() => setUnitPage(safePage + 1)}>
                        Next →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
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
                  { value: "partial", label: "Nyicil/sebagian" },
                  { value: "overdue", label: "Overdue" },
                  { value: "paid", label: "Lunas" },
                ]}
                onChange={setBillStatus}
              />
            </div>
            <Button size="sm" onClick={() => openSheet("generate")}>Generate</Button>
          </div>
          {(() => {
            const sel = (bills.data ?? []).filter((b) => selected.includes(b.id));
            const selPayable = sel.filter((b) => b.remaining > 0);
            const selBilled = sel.filter((b) => b.paidTotal > 0);
            if (sel.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
                <span className="text-muted-foreground">{sel.length} dipilih</span>
                {selPayable.length > 0 && (
                  <Button size="sm" onClick={() => setBulkOpen(true)}>
                    Bayar {selPayable.length} tagihan
                  </Button>
                )}
                {selBilled.length >= 2 && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/tagihan/invoice?ids=${selBilled.map((b) => b.id).join(",")}`, "_blank")}>
                    Invoice gabungan
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Batal</Button>
              </div>
            );
          })()}
          {(bills.data ?? []).map((b) => (
            <Card key={b.id} className={b.computedStatus === "overdue" ? "border-destructive" : ""}>
              <CardContent className="flex flex-col gap-2 pt-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {b.remaining > 0 && (
                      <input
                        type="checkbox" className="mt-1 h-4 w-4 accent-primary"
                        checked={selected.includes(b.id)}
                        onChange={(e) => setSelected((s) => e.target.checked ? [...s, b.id] : s.filter((id) => id !== b.id))}
                        aria-label={`Pilih ${periodLabel(b.period)}`}
                      />
                    )}
                    <div>
                      <p className="font-medium">{b.tenant.name} · {b.unit.property.name} {b.unit.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {periodLabel(b.period)} · jatuh tempo {formatDateID(b.dueDate)} · {formatIDR(b.amount)}
                        {b.paidTotal > 0 && ` · dibayar ${formatIDR(b.paidTotal)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={b.computedStatus === "paid" ? "outline" : b.computedStatus === "overdue" ? "destructive" : "secondary"}>
                    {b.computedStatus === "paid"
                      ? "Lunas"
                      : b.computedStatus === "partial"
                        ? `Nyicil · sisa ${formatIDR(b.remaining)}`
                        : b.computedStatus === "overdue" ? `Telat H+${b.lateDays}` : "Belum bayar"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.remaining > 0 ? (
                    <>
                      <Button size="sm" onClick={() => openSheet("pay", b.id)}>
                        {b.paidTotal > 0 ? "Bayar sisa" : "Bayar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => waTagih(b)}>WA tagih</Button>
                      {b.payments.length === 0 && (
                        <Button size="sm" variant="ghost" onClick={() => delBill.mutate(b.id)}>Hapus</Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/tagihan/${b.id}/invoice`, "_blank")}>Invoice</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        window.open(waLink(b.tenant.phoneWa, lunasText({ tenantName: b.tenant.name, unitCode: b.unit.code, periodLabel: periodLabel(b.period), amount: b.amount, ownerName })), "_blank");
                        toast.success("Template lunas dibuka");
                      }}>WA lunas</Button>
                    </>
                  )}
                </div>
                {b.payments.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2 text-xs">
                    {b.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2">
                        <span>
                          {formatDateID(p.paidAt)} · {formatIDR(p.amount)} ({p.method})
                          {p.proofPath && (
                            <> · <a href={`/api/files/${p.proofPath}`} target="_blank" className="underline">bukti</a></>
                          )}
                        </span>
                        <Button
                          size="sm" variant="ghost" className="h-6 px-2 text-xs"
                          disabled={voidPay.isPending}
                          onClick={() => {
                            if (window.confirm(`Batalkan pembayaran ${formatIDR(p.amount)}?`)) voidPay.mutate(p.id);
                          }}
                        >
                          Void
                        </Button>
                      </div>
                    ))}
                  </div>
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
              ["Masuk", formatIDR((bills.data ?? []).reduce((s, b) => s + b.paidTotal, 0))],
              ["Keluar", formatIDR((expenses.data ?? []).reduce((s, e) => s + e.amount, 0))],
              ["Saldo", formatIDR((bills.data ?? []).reduce((s, b) => s + b.paidTotal, 0) - (expenses.data ?? []).reduce((s, e) => s + e.amount, 0))],
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
      <PayDialog bill={(() => {
        const b = (bills.data ?? []).find((x) => x.id === billId);
        return b ? { id: b.id, amount: b.amount, remaining: b.remaining } : null;
      })()} />
      <BulkPayDialog
        open={bulkOpen}
        bills={(bills.data ?? []).filter((b) => selected.includes(b.id) && b.remaining > 0)}
        onClose={() => { setBulkOpen(false); setSelected([]); }}
      />
      <ExpenseSheet />
    </main>
  );
}
