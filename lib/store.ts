"use client";

import { create } from "zustand";

type TabId = "dashboard" | "properti" | "penghuni" | "tagihan" | "kas";

interface UIState {
  tab: TabId;
  setTab: (t: TabId) => void;
  sheet: string | null; // 'property-form' | 'unit-form' | 'tenant-form' | 'checkin' | 'generate' | 'pay' | 'expense-form' | 'history'
  billId: string | null; // tagihan terpilih untuk dialog bayar
  editId: string | null; // id data yg diedit (properti/unit/penghuni) atau tenantId utk riwayat
  openSheet: (s: string, billId?: string, editId?: string) => void;
  closeSheet: () => void;
}

export const useUI = create<UIState>((set) => ({
  tab: "dashboard",
  setTab: (tab) => set({ tab }),
  sheet: null,
  billId: null,
  editId: null,
  openSheet: (sheet, billId, editId) => set({ sheet, billId: billId ?? null, editId: editId ?? null }),
  closeSheet: () => set({ sheet: null, billId: null, editId: null }),
}));
