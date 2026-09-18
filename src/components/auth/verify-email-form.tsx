"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ResendVerification } from "@/components/auth/resend-verification";
import { verifyEmail } from "@/lib/api/auth.client";
import { ApiError } from "@/lib/api/core";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [error, setError] = useState<string | null>(null);
  // 400 = токен неверный/просрочен: единственный случай, когда имеет смысл предложить новую ссылку
  // (сеть/5xx — не проблема токена, повторная отправка ничего не исправит).
  const [tokenRejected, setTokenRejected] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTokenRejected(false);
    setPending(true);

    try {
      await verifyEmail(token);
      setDone(true);
    } catch (err) {
      setTokenRejected(err instanceof ApiError && err.status === 400);
      setError(err instanceof ApiError ? err.message : "Не удалось подтвердить email");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">Email подтверждён</h1>
          <p className="text-sm text-muted-foreground">Теперь можно войти в аккаунт.</p>
        </div>
        <Button asChild>
          <Link href="/login">Войти</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Подтверждение email</h1>
          <p className="text-sm text-muted-foreground">
            Вставьте токен из письма (или из ссылки вида <code>?token=...</code>).
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="token">Токен</Label>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Подтверждаем..." : "Подтвердить"}
        </Button>
      </form>

      {tokenRejected && token !== "" ? (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Ссылка устарела или уже использована? Пришлём новую.</p>
            <ResendVerification token={token} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Не пришло письмо? Попробуйте{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            войти
          </Link>{" "}
          — если email не подтверждён, мы предложим отправить письмо повторно.
        </p>
      )}
    </div>
  );
}
