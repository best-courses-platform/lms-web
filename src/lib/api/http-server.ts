import "server-only";
import { cookies } from "next/headers";
import { apiUrl, parseResponse, ApiError } from "./core";

// Для Server Components/Route Handlers: авторизация — httpOnly cookie, которую браузер
// сам не пробрасывает на fetch, сделанный ИЗ Node-процесса Next.js. Здесь мы читаем cookie
// текущего запроса вручную и подставляем в исходящий запрос к express-lms.
export async function apiServer<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();

  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      Cookie: cookieStore.toString(),
    },
    // Данные курсов/пользователя специфичны для конкретного запроса (cookie, права
    // доступа) — не то, что Next должен кэшировать между разными пользователями.
    cache: "no-store",
  });

  return parseResponse<T>(res);
}

// Для мест, где отсутствие сессии — не ошибка, а нормальный "гость" (например, хедер
// решает, что показать: логин или аватар). Любая ApiError гасится в null, чтобы сбой
// авторизации не ронял всю страницу целиком.
export async function apiServerSafe<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiServer<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
}

export { ApiError };
