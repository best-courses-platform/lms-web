"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/lib/api/auth.client";
import { ApiError } from "@/lib/api/core";

// Пауза между повторными отправками. Бэкенд ограничивает частоту сам (серверная пауза на
// пользователя + authRateLimiter), пауза здесь — только чтобы человек видел, что письмо
// отправлено, и не жал кнопку раз за разом, не дожидаясь почты.
export const RESEND_COOLDOWN_SECONDS = 60;

// Кого просим отправить письмо: по email (письмо не пришло — известен из формы регистрации/входа)
// либо по токену из просроченной ссылки (аккаунт бэкенд находит по токену, email не нужен).
type ResendVerificationProps = { email: string; token?: never } | { token: string; email?: never };

export function ResendVerification(props: ResendVerificationProps) {
  const target = props.token !== undefined ? { token: props.token } : { email: props.email };
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      await resendVerification(target);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setSent(false);
      setError(err instanceof ApiError ? err.message : "Не удалось отправить письмо, попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  const idleLabel = "token" in target ? "Отправить новую ссылку" : "Отправить письмо повторно";
  const buttonLabel = pending
    ? "Отправляем..."
    : cooldown > 0
      ? `Отправить повторно через ${cooldown} с`
      : idleLabel;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Button type="submit" variant="outline" disabled={pending || cooldown > 0}>
        {buttonLabel}
      </Button>

      {/* Бэкенд отвечает одинаково для незнакомого/уже подтверждённого аккаунта и во время паузы
          между письмами (защита от user enumeration) — текст нейтральный, не "письмо отправлено". */}
      {sent && (
        <p role="status" className="text-sm text-muted-foreground">
          Если этот email ещё не подтверждён, мы отправили новое письмо. Проверьте почту, включая папку «Спам».
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
