"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { PropertySheet } from "@/components/property-sheet";
import { UnitSheet } from "@/components/unit-sheet";
import { TenantSheet } from "@/components/tenant-sheet";
import { HistorySheet } from "@/components/history-sheet";
import { CheckinDialog } from "@/components/checkin-dialog";
import { ExpenseSheet } from "@/components/expense-sheet";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { PropertiTab } from "@/components/tabs/properti-tab";
import { PenghuniTab } from "@/components/tabs/penghuni-tab";
import { TagihanTab } from "@/components/tabs/tagihan-tab";
import { KasTab } from "@/components/tabs/kas-tab";
import { useUI } from "@/lib/store";

const thisMonth = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

// Shell: header + Tabs + sheet global. Isi tiap tab ada di components/tabs/*.
export default function Home() {
  const { tab, setTab } = useUI();
  const [billPeriod, setBillPeriod] = useState(thisMonth());
  const [billStatus, setBillStatus] = useState("all");

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
          <DashboardTab />
        </TabsContent>

        <TabsContent value="properti" className="flex flex-col gap-3">
          <PropertiTab />
        </TabsContent>

        <TabsContent value="penghuni" className="flex flex-col gap-3">
          <PenghuniTab />
        </TabsContent>

        <TabsContent value="tagihan" className="flex flex-col gap-3">
          <TagihanTab
            billPeriod={billPeriod} setBillPeriod={setBillPeriod}
            billStatus={billStatus} setBillStatus={setBillStatus}
          />
        </TabsContent>

        <TabsContent value="kas" className="flex flex-col gap-3">
          <KasTab billPeriod={billPeriod} />
        </TabsContent>
      </Tabs>

      <PropertySheet />
      <UnitSheet />
      <TenantSheet />
      <HistorySheet />
      <CheckinDialog />
      <ExpenseSheet />
    </main>
  );
}
