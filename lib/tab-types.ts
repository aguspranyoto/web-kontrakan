// Tipe data shared antar tab (dipindah dari app/page.tsx biar ramping).

export type Lease = {
  id: string;
  unit: { id: string; code: string; property: { name: string } };
  tenant: { id: string; name: string; phoneWa: string };
};

export type BillPayment = {
  id: string; amount: number; method: string; paidAt: string; proofPath: string;
};

export type Bill = {
  id: string; period: string; amount: number; dueDate: string; note: string;
  computedStatus: "paid" | "partial" | "unpaid" | "overdue"; lateDays: number;
  paidTotal: number; remaining: number;
  unit: { code: string; property: { name: string } };
  tenant: { name: string; phoneWa: string };
  payments: BillPayment[];
};

export type Dash = {
  month: string; totalUnits: number; occupied: number; vacant: number;
  income: number; outcome: number; balance: number;
  overdueCount: number; overdueNominal: number;
  overdue: { id: string; period: string; amount: number; dueDate: string; lateDays: number; tenant: string; phoneWa: string; unit: string; property: string }[];
  dueSoon: { id: string; period: string; amount: number; dueDate: string; tenant: string; unit: string; property: string }[];
};

export type Expense = {
  id: string; date: string; category: string; amount: number; note: string;
  property: { name: string } | null;
};
