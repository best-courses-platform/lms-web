import "client-only";
import { apiUrl, parseResponse, ApiError } from "./core";

// Для Client Components (формы логина/регистрации/рейтинга): здесь cookie пробрасывать
// не нужно — это обычный fetch из браузера, он сам приложит httpOnly cookie к запросу
// на тот же origin. credentials: 'include' обязателен, иначе браузер cookie не отправит
// на кросс-origin запрос (в dev Next и Express — разные порты, см. .env.local/README).
export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  return parseResponse<T>(res);
}

export { ApiError };
