// Общая часть для apiServer/apiClient — форма ответа/ошибки одна и та же для обоих,
// потому что оба в итоге бьют в тот же express-lms API (см. src/middleware/error-handler.ts
// на бэкенде: { error: string, details?: unknown } на любую ошибку, независимо от статуса).

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL;

  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL не задан — см. .env.local");
  }

  return `${base}${path}`;
}

export async function parseResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body: unknown = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Ошибка запроса (${res.status})`;
    const details = body && typeof body === "object" ? (body as { details?: unknown }).details : undefined;

    throw new ApiError(res.status, message, details);
  }

  return body as T;
}
