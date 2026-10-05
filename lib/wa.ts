import { formatIDR, formatDateID } from "./format";

// Template WA manual via wa.me (PRD §4.10) — tanpa gateway
export function waLink(phone62: string, text: string): string {
  return `https://wa.me/${phone62}?text=${encodeURIComponent(text)}`;
}

export function tagihText(opts: {
  tenantName: string;
  unitCode: string;
  propertyName: string;
  periodLabel: string;
  amount: number;
  dueDate: Date | string;
  ownerName: string;
}): string {
  return (
    `Yth Bpk/Ibu ${opts.tenantName}, ` +
    `tagihan kontrakan ${opts.propertyName} ${opts.unitCode} periode ${opts.periodLabel} ` +
    `sebesar ${formatIDR(opts.amount)} jatuh tempo ${formatDateID(opts.dueDate)}. ` +
    `Mohon transfer/kirim bukti. Terima kasih - ${opts.ownerName}`
  );
}

export function telatText(opts: {
  tenantName: string;
  unitCode: string;
  periodLabel: string;
  amount: number;
  lateDays: number;
  ownerName: string;
}): string {
  return (
    `Yth Bpk/Ibu ${opts.tenantName}, ` +
    `tagihan ${opts.unitCode} periode ${opts.periodLabel} ${formatIDR(opts.amount)} ` +
    `sudah TELAT ${opts.lateDays} hari. Mohon segera dibayar. Terima kasih - ${opts.ownerName}`
  );
}

export function lunasText(opts: {
  tenantName: string;
  unitCode: string;
  periodLabel: string;
  amount: number;
  ownerName: string;
}): string {
  return (
    `Terima kasih Bpk/Ibu ${opts.tenantName} (${opts.unitCode}) periode ${opts.periodLabel} ` +
    `${formatIDR(opts.amount)} sudah kami terima. - ${opts.ownerName}`
  );
}
