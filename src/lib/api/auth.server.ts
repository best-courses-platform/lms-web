import "server-only";
import { apiServerSafe } from "./http-server";
import type { User } from "./types";

// Используется в Server Components (хедер, страницы), где нужно узнать "кто сейчас
// смотрит" по cookie текущего запроса. 401/403 (гость) — не ошибка, просто null.
export async function getCurrentUser(): Promise<User | null> {
  const data = await apiServerSafe<{ user: User }>("/api/auth/me");
  return data?.user ?? null;
}
