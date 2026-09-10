"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, Monitor } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAll, revokeSession } from "@/lib/api/auth.client";
import { ApiError } from "@/lib/api/core";
import type { SessionView } from "@/lib/api/types";

function formatDate(value: string | null): string {
  // Спека (schema.gen.ts) типизирует все даты как string | null — общее для любого
  // coerced-в-Date поля в zod-to-openapi, не гарантия, что конкретно у сессии дата
  // когда-либо реально отсутствует. Такой fallback дешевле, чем спорить со спекой.
  if (!value) return "неизвестно";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function sessionsWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "сессия";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "сессии";
  return "сессий";
}

export function SessionsList({ initialSessions }: { initialSessions: SessionView[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllPending, setLogoutAllPending] = useState(false);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Сессия завершена");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось завершить сессию, попробуйте ещё раз");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogoutAll() {
    setLogoutAllPending(true);
    try {
      await logoutAll();
      // logoutAll гасит и текущую сессию тоже — cookie после этого мертва, обычный
      // router.refresh() тут не поможет, нужен полноценный переход на /login.
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось выйти отовсюду, попробуйте ещё раз");
      setLogoutAllPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {sessions.length} активных {sessionsWord(sessions.length)}
        </p>

        <AlertDialog open={logoutAllOpen} onOpenChange={(next) => !logoutAllPending && setLogoutAllOpen(next)}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              <LogOut />
              Выйти отовсюду
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Выйти отовсюду?</AlertDialogTitle>
              <AlertDialogDescription>
                Все сессии на всех устройствах — включая то, с которого вы сейчас смотрите
                эту страницу — будут завершены. Понадобится войти заново.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={logoutAllPending}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={logoutAllPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleLogoutAll();
                }}
              >
                {logoutAllPending ? <Loader2 className="size-4 animate-spin" /> : "Выйти отовсюду"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Monitor className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-0.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{session.userAgent ?? "Неизвестное устройство"}</span>
                    {session.current && <Badge variant="secondary">Это устройство</Badge>}
                  </div>
                  <span className="text-muted-foreground">
                    {session.ip ?? "IP неизвестен"} · последняя активность:{" "}
                    {session.lastUsedAt ? formatDate(session.lastUsedAt) : "только что выдана"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Вход: {formatDate(session.createdAt)} · истекает: {formatDate(session.expiresAt)}
                  </span>
                </div>
              </div>

              {!session.current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokingId === session.id}
                  onClick={() => handleRevoke(session.id)}
                >
                  {revokingId === session.id ? <Loader2 className="size-4 animate-spin" /> : "Завершить"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
