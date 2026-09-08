import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Silent-refresh для Server Components/Route Handlers/Server Actions — то, чего не хватало
// на бэкенде до среза access-токена с 8h до 15m (см. express-lms/Рефакторинг проблем/31,
// раздел 9.1). apiServer (lib/api/http-server.ts) читает cookie ТЕКУЩЕГО запроса через
// next/headers cookies() — сам по себе он ничего продлить не может: Server Component не
// вправе ставить cookie (Next это явно запрещает вне Server Action/Route Handler). Proxy —
// единственное место, которое видит запрос ДО рендера и может и прочитать, и переписать
// cookie на лету, поэтому именно здесь и живёт вся логика.
//
// Для клиентских fetch (apiClient, lib/api/http-client.ts) proxy бесполезен — те бьют
// напрямую в express-lms (другой origin), proxy их не видит вообще. Для них отдельный
// перехватчик 401 → refresh → retry прямо в http-client.ts.
//
// Куки — обычные заголовки: браузер сам перестаёт слать access_token, как только у него
// истёк maxAge (см. jwtService.setTokensCookies), поэтому "куки нет в запросе" — уже готовый,
// бесплатный сигнал "токен просрочен", без разбора самого JWT.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (accessToken || !refreshToken) {
    return NextResponse.next();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.next();
  }

  const refreshed = await tryRefresh(apiUrl, refreshToken, request);

  if (!refreshed) {
    // Refresh-сессия мертва (протухла/отозвана/reuse detection) — не чистим cookie здесь
    // специально, express и так не отдал новую пару, старый access_token уже отсутствует.
    // Запрос просто идёт дальше как гостевой: apiServer получит 401 на /me, getCurrentUser()
    // гасит его в null — штатное поведение "не залогинен", ничем не хуже сегодняшнего.
    return NextResponse.next();
  }

  // Переписываем ОБА места: заголовок Cookie исходящего к рендеру запроса — чтобы уже ЭТОТ
  // Server Component увидел свежий access_token (иначе пользователь получил бы один гостевой
  // рендер сразу после протухания токена, до следующей навигации); и response.cookies — чтобы
  // браузер сохранил обновлённую пару и не повторял то же самое на каждый следующий переход.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    serializeCookieHeader(request.cookies.getAll(), {
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
    })
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("access_token", refreshed.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  });
  response.cookies.set("refresh_token", refreshed.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  });

  return response;
}

type RefreshResult = { accessToken: string; refreshToken: string };

async function tryRefresh(apiUrl: string, refreshToken: string, request: NextRequest): Promise<RefreshResult | null> {
  try {
    // User-Agent/X-Forwarded-For — только для отображения в "активных сессиях" (SessionView
    // на бэкенде их же и хранит только для этого, см. refresh-session.types.ts). Без проброса
    // express увидел бы адрес и UA самого Next-сервера (fetch из Node), а не браузера —
    // не баг безопасности (эти поля никогда не участвуют в проверках), просто бесполезная запись.
    const forwardedHeaders: Record<string, string> = { Cookie: `refresh_token=${refreshToken}` };
    const userAgent = request.headers.get("user-agent");
    if (userAgent) {
      forwardedHeaders["User-Agent"] = userAgent;
    }
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      forwardedHeaders["X-Forwarded-For"] = forwardedFor;
    }

    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: forwardedHeaders,
    });

    if (!res.ok) {
      return null;
    }

    // fetch() в Node.js-рантайме proxy не даёт удобного API на несколько Set-Cookie сразу
    // (res.headers.get('set-cookie') отдаёт их слитыми через запятую) — getSetCookie()
    // возвращает массив как есть, ровно то, что нужно для двух независимых cookie.
    const setCookies = res.headers.getSetCookie();
    const accessToken = extractCookieValue(setCookies, "access_token");
    const newRefreshToken = extractCookieValue(setCookies, "refresh_token");

    if (!accessToken || !newRefreshToken) {
      return null;
    }

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    // Сеть/express недоступен — не роняем рендер страницы из-за этого, просто остаёмся
    // гостем на этот запрос, следующий запрос попробует снова.
    return null;
  }
}

function extractCookieValue(setCookieHeaders: string[], name: string): string | null {
  const prefix = `${name}=`;
  const header = setCookieHeaders.find((h) => h.startsWith(prefix));
  if (!header) {
    return null;
  }
  return header.slice(prefix.length).split(";")[0];
}

function serializeCookieHeader(
  existing: { name: string; value: string }[],
  overrides: Record<string, string>
): string {
  const merged = new Map(existing.map((c) => [c.name, c.value]));
  for (const [name, value] of Object.entries(overrides)) {
    merged.set(name, value);
  }
  return Array.from(merged.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export const config = {
  matcher: [
    // Всё, кроме статики/картинок/иконки — на них refresh не имеет смысла и только тратит
    // лишний round-trip к express-lms на каждый ассет.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
