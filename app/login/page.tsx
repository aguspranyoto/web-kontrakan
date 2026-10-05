"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { loginSchema } from "@/lib/validations";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormInput = z.input<typeof loginSchema>;
type FormOutput = z.output<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(v: FormOutput) {
    const t = toast.loading("Masuk...");
    const res = await signIn("credentials", { ...v, redirect: false });
    toast.dismiss(t);
    if (res?.error) toast.error("Login gagal: email/password salah");
    else {
      toast.success("Berhasil masuk");
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>web-kontrakan — Masuk</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {formState.errors.email && (
                <p className="text-sm text-destructive">{formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            </div>
            <Button type="submit" disabled={formState.isSubmitting} className="w-full">
              {formState.isSubmitting ? "Masuk..." : "Masuk"}
            </Button>
          </form>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Belum punya akun internal? <Link href="/signup" className="underline">Daftar</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
