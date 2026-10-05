"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Wrapper Select yg menampilkan LABEL (bukan raw value) — Base UI Value default render value.
export function FieldSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange((v as string) ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(v: unknown) => {
            const label = options.find((o) => o.value === v)?.label;
            // function children menonaktifkan placeholder bawaan → render manual
            return label ?? placeholder ?? "";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
