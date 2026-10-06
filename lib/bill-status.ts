// Helper status tagihan utk multi-payment / cicilan (1 bill bisa banyak payment).
// paid: total bayar >= amount · partial: bayar sebagian · overdue/unpaid: belum ada bayar.

export type PaymentLike = { amount: number };

export type BillLike = {
  amount: number;
  dueDate: Date | string;
  payments: PaymentLike[];
};

export function paidTotal(b: BillLike): number {
  return b.payments.reduce((s, p) => s + p.amount, 0);
}

export function remaining(b: BillLike): number {
  return Math.max(0, b.amount - paidTotal(b));
}

export type BillStatus = "paid" | "partial" | "overdue" | "unpaid";

export function billStatus(b: BillLike, now: Date = new Date()): BillStatus {
  if (remaining(b) <= 0) return "paid";
  if (paidTotal(b) > 0) return "partial";
  return new Date(b.dueDate) < now ? "overdue" : "unpaid";
}

export function lateDays(dueDate: Date | string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(dueDate).getTime()) / 86400000));
}
