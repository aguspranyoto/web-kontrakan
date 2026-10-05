"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { signupSchema } from "@/lib/validations";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormInput = z.input<typeof signupSchema>;
type FormOutput = z.output<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "Owner" },
  });

  async function onSubmit(v: FormOutput) {
    const t = toast.loading("Mendaftar...");
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const j = await res.json().catch(() => ({}));
    toast.dismiss(t);
    if (!res.ok) {
      toast.error(j.error ?? "Gagal daftar");
      return;
    }
    toast.success("Akun dibuat, masuk...");
    const login = await signIn("credentials", { email: v.email, password: v.password, redirect: false });
    if (login?.error) {
      toast.success("Silakan login");
      router.push("/login");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Daftar (internal)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" {...register("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {formState.errors.email && (
                <p className="text-sm text-destructive">{formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {formState.errors.password && (
                <p className="text-sm text-destructive">{formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={formState.isSubmitting} className="w-full">
              {formState.isSubmitting ? "Mendaftar..." : "Daftar"}
            </Button>
          </form>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Sudah punya akun? <Link href="/login" className="underline">Masuk</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
