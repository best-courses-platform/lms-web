import "client-only";
import { apiUrl, parseResponse, ApiError } from "./core";

// Для Client Components (формы логина/регистрации/рейтинга): здесь cookie пробрасывать
// не нужно — это обычный fetch из браузера, он сам приложит httpOnly cookie к запросу
// на тот же origin. credentials: 'include' обязателен, иначе браузер cookie не отправит
// на кросс-origin запрос (в dev Next и Express — разные порты, см. .env.local/README).
export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    credentials: "include",
  });

  return parseResponse<T>(res);
}

export { ApiError };
