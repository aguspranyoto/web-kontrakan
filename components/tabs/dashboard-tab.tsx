"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import type { Dash } from "@/lib/tab-types";
import { formatIDR, formatDateID } from "@/lib/format";

// Tab Home: kartu ringkas + alarm overdue/H-7 (PRD §4.9).
export function DashboardTab() {
  const { setTab } = useUI();
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Gagal muat dashboard");
      return (await r.json()) as Dash;
    },
  });

  return (
    <>
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
    </>
  );
}
