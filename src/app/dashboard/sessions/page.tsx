import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionsList } from "@/components/auth/sessions-list";
import { getCurrentUser, getSessions } from "@/lib/api/auth.server";

export const metadata: Metadata = { title: "Активные сессии — Best Courses" };

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const sessions = await getSessions();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Активные сессии</h1>
        <p className="text-muted-foreground">
          Устройства и браузеры, где сейчас действует ваш вход. Что-то незнакомое — завершите
          отдельную сессию или выйдите отовсюду разом.
        </p>
      </div>

      <div className="mt-8">
        <SessionsList initialSessions={sessions} />
      </div>
    </div>
  );
}
