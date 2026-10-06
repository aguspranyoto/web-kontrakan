"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import { formatIDR } from "@/lib/format";

const UNIT_PER_PAGE = 9;

// Tab Unit: list kontrakan (kiri) + grid unit 3 kolom + pagination (kanan).
export function PropertiTab() {
  const { openSheet } = useUI();
  const [selProp, setSelProp] = useState<string | null>(null);
  const [unitPage, setUnitPage] = useState(1);

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
  });

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
}
