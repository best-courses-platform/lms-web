import "client-only";
import { apiUrl, parseResponse, ApiError } from "./core";
import { refreshAccessToken } from "./token-refresh";

// Эндпоинты, не защищённые jwtAuth на бэкенде (auth.routes.ts) — 401 с них никогда не значит
// "access-токен протух", а что-то другое (неверный пароль на /login и т.п.). Пытаться освежить
// токен на них бессмысленно и просто тратит бюджет authRateLimiter второй раз без причины;
// /refresh — отдельно, чтобы неудачный /refresh не пытался освежить сам себя.
const NO_REFRESH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/login/local",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
]);

// Для Client Components (формы логина/регистрации/рейтинга): здесь cookie пробрасывать
// не нужно — это обычный fetch из браузера, он сам приложит httpOnly cookie к запросу
// на тот же origin. credentials: 'include' обязателен, иначе браузер cookie не отправит
// на кросс-origin запрос (в dev Next и Express — разные порты, см. .env.local/README).
export async function apiClient<T>(path: string, init: RequestInit = {}, _retried = false): Promise<T> {
  // FormData (загрузка файлов) сама выставляет Content-Type: multipart/form-data
  // с нужным boundary — если поставить application/json поверх, браузер не сможет
  // распарсить своё же тело, запрос уйдёт битым.
  const isFormData = init.body instanceof FormData;

  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    credentials: "include",
  });

  // Silent-refresh: access-токен короткоживущий (15 минут — express-lms/Рефакторинг
  // проблем/31), протухнуть посреди работы с открытой вкладкой — обычная ситуация, а не
  // ошибка пользователя. Пробуем ровно один раз (retried), чтобы не зациклиться, если
  // /refresh сам вернул 401 (сессия отозвана/протухла) — тогда просто отдаём исходную ошибку.
  if (res.status === 401 && !_retried && !NO_REFRESH_PATHS.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiClient<T>(path, init, true);
    }
  }

  return parseResponse<T>(res);
}

export { ApiError };
