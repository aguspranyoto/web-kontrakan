"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import type { Lease } from "@/lib/tab-types";

const TENANT_PER_PAGE = 9;

// Tab Penghuni: grid 3 kolom full-width + pagination.
export function PenghuniTab() {
  const { openSheet } = useUI();
  const qc = useQueryClient();
  const [tenantPage, setTenantPage] = useState(1);

  const tenants = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const r = await fetch("/api/tenants");
      if (!r.ok) throw new Error("Gagal muat penghuni");
      return (await r.json()) as { id: string; name: string; phoneWa: string; leases: { unit: { code: string; property: { name: string } } }[] }[];
    },
  });
  const leases = useQuery({
    queryKey: ["leases"],
    queryFn: async () => {
      const r = await fetch("/api/leases");
      if (!r.ok) throw new Error("Gagal muat hunian");
      return (await r.json()) as Lease[];
    },
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

  type TenantItem =
    | { key: string; kind: "lease"; lease: Lease; tenant: Lease["tenant"] }
    | { key: string; kind: "free"; lease?: undefined; tenant: { id: string; name: string; phoneWa: string } };
  const items: TenantItem[] = [
    ...(leases.data ?? []).map((l): TenantItem => ({ key: `lease-${l.id}`, kind: "lease", lease: l, tenant: l.tenant })),
    ...(tenants.data ?? [])
      .filter((t) => t.leases.length === 0)
      .map((t): TenantItem => ({ key: `free-${t.id}`, kind: "free", tenant: t })),
  ];
  const pages = Math.max(1, Math.ceil(items.length / TENANT_PER_PAGE));
  const safePage = Math.min(tenantPage, pages);
  const pageItems = items.slice((safePage - 1) * TENANT_PER_PAGE, safePage * TENANT_PER_PAGE);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Penghuni</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openSheet("checkin")}>Check-in</Button>
          <Button size="sm" onClick={() => openSheet("tenant-form")}>+ Penghuni</Button>
        </div>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada penghuni.</p>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {pageItems.map((it) => (
          <Card key={it.key}>
            <CardContent className="flex flex-col gap-2 pt-4 text-sm">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-lg font-bold">{it.tenant.name}</p>
                {it.kind === "lease" ? (
                  <Badge variant="default">{it.lease.unit.code}</Badge>
                ) : (
                  <Badge variant="secondary">Belum menghuni</Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {it.kind === "lease"
                  ? `${it.lease.unit.property.name} · ${it.tenant.phoneWa}`
                  : it.tenant.phoneWa}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => openSheet("history", undefined, it.tenant.id)}>
                  Riwayat
                </Button>
                {it.kind === "lease" ? (
                  <Button size="sm" variant="outline" className="flex-1" disabled={checkout.isPending} onClick={() => checkout.mutate(it.lease.id)}>
                    Checkout
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => openSheet("tenant-form", undefined, it.tenant.id)}>
                      Ubah
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`https://wa.me/${it.tenant.phoneWa}`, "_blank")}>
                      WA
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setTenantPage(safePage - 1)}>
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">{safePage} / {pages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= pages} onClick={() => setTenantPage(safePage + 1)}>
            Next →
          </Button>
        </div>
      )}
    </>
  );
}
