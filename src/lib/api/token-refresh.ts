import "client-only";
import { apiUrl } from "./core";

// Дедупликация конкурентных 401: если несколько компонентов дёрнули apiClient почти
// одновременно прямо в момент истечения access-токена, все они ловят 401 в одну и ту же
// секунду — без этого каждый из них independently дёрнул бы /api/auth/refresh. Это не защита
// от гонки самой по себе (та решена на бэкенде grace-window'ом, см. express-lms/Рефакторинг
// проблем/31, раздел 5.4) — а просто экономия: иначе весь бюджет authRateLimiter
// (10 запросов/15 мин) на IP съедался бы дублями одного и того же события за секунды.
let inFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function refreshAccessToken(): Promise<boolean> {
  if (!inFlight) {
    inFlight = performRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
