"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-6 w-full rounded bg-black p-2 text-white print:hidden">
      Cetak / Simpan PDF
    </button>
  );
}
