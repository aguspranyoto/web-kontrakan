export function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateID(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(dt);
}

export function periodLabel(period: string): string {
  // YYYY-MM -> "Jan 2026"
  const [y, m] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

export function daysLate(dueDate: Date | string, now = new Date()): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return Math.floor((now.getTime() - due.getTime()) / 86400000);
}

export function daysUntil(dueDate: Date | string, now = new Date()): number {
  return -daysLate(dueDate, now);
}
