import { z } from "zod";

// Normalisasi 08xx -> 62xx (PRD §4.3)
export function normalizeWa(input: string): string {
  let s = input.replace(/[^0-9+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("08")) s = "62" + s.slice(1);
  if (s.startsWith("8") && !s.startsWith("62")) s = "62" + s;
  return s;
}

export const waPhoneSchema = z
  .string()
  .min(1, "No. telp wajib diisi")
  .transform((v) => normalizeWa(v))
  .pipe(z.string().regex(/^62\d{7,14}$/, "No. WA tidak valid (cth. 0812... / 62812...)"));

export const propertySchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  address: z.string().default(""),
  note: z.string().default(""),
});

export const unitSchema = z.object({
  propertyId: z.string().min(1),
  code: z.string().min(1, "Kode unit wajib (cth. A1)"),
  monthlyPrice: z.coerce.number().int().min(0, "Harga minimal 0"),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE"]).default("VACANT"),
  note: z.string().default(""),
});

export const tenantSchema = z.object({
  name: z.string().min(2, "Nama wajib diisi"),
  phoneWa: waPhoneSchema,
  idNumber: z.string().default(""),
  emergencyContact: z.string().default(""),
  note: z.string().default(""),
});

export const checkinSchema = z.object({
  unitId: z.string().min(1),
  tenantId: z.string().min(1),
  startDate: z.coerce.date(),
  monthlyPriceSnapshot: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0).default(0),
});

export const generateBillsSchema = z.object({
  propertyId: z.string().min(1),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode format YYYY-MM"),
  dueDate: z.coerce.date(),
});

export const payBillSchema = z.object({
  billId: z.string().min(1),
  paidAt: z.coerce.date().default(() => new Date()),
  amount: z.coerce.number().int().min(1),
  method: z.enum(["CASH", "TRANSFER"]),
  note: z.string().max(500).default(""),
  // proofFile divalidasi terpisah di route (wajib bila TRANSFER, max 2MB, jpg/png/webp)
});

export const expenseSchema = z.object({
  propertyId: z.string().optional().nullable(),
  date: z.coerce.date(),
  category: z.string().min(1).default("Lainnya"),
  amount: z.coerce.number().int().min(1, "Nominal minimal 1"),
  note: z.string().default(""),
});

export const signupSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter").default("Owner"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
