import "server-only";
import { apiServer, apiServerSafe } from "./http-server";
import type { SessionView, User } from "./types";

// Используется в Server Components (хедер, страницы), где нужно узнать "кто сейчас
// смотрит" по cookie текущего запроса. 401/403 (гость) — не ошибка, просто null.
export async function getCurrentUser(): Promise<User | null> {
  const data = await apiServerSafe<{ user: User }>("/api/auth/me");
  return data?.user ?? null;
}

// Требует авторизации (jwtAuth на бэкенде) — страница /dashboard/sessions уже сама делает
// redirect("/login") для гостя через getCurrentUser() выше, поэтому здесь без *Safe-варианта:
// 401 сюда долетать не должен, а если долетел — это реальная ошибка, не штатный гость.
// "current" в ответе бэкенд определяет по refresh_token cookie ТЕКУЩЕГО запроса — apiServer
// пробрасывает её как есть, отдельно ничего передавать не нужно.
export function getSessions(): Promise<SessionView[]> {
  return apiServer<{ sessions: SessionView[] }>("/api/auth/sessions").then((data) => data.sessions);
}
