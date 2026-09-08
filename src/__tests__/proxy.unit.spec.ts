import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

// proxy.ts — единственное место, которое может и прочитать, и переписать cookie ДО рендера
// Server Component (сам Server Component этого сделать не может — см. комментарий в файле).
// Здесь проверяется именно эта развилка: когда silent-refresh должен сработать, а когда нет,
// и что оба места (заголовок Cookie для текущего рендера + Set-Cookie для браузера) реально
// получают новую пару токенов. next/server (NextRequest/NextResponse) — обычные web-standard
// классы, работают под Vitest без реального Next-рантайма, в отличие от next/headers/"server-only"
// (см. комментарий в vitest.config.ts про исключение *server.ts).
function makeRequest(cookie: string | undefined, extraHeaders: Record<string, string> = {}) {
  return new NextRequest("https://lms.example.com/dashboard", {
    headers: { ...(cookie ? { cookie } : {}), ...extraHeaders },
  });
}

// Внутреннее кодирование Next.js для "переписать заголовки запроса, идущего дальше в рендер" —
// см. probe в комментарии PR: NextResponse.next({ request: { headers } }) добавляет
// x-middleware-request-<header> на САМ возвращаемый response-объект (это не то, что увидит
// браузер, а служебный канал между proxy и последующим рендером Next).
function rewrittenCookieHeader(res: Response): string | null {
  return res.headers.get("x-middleware-request-cookie");
}

// Порядок пар в самой строке — деталь реализации (Map: существующие ключи сохраняют позицию,
// новые добавляются в конец), проверять его не нужно — важно только то, какие пары там есть.
function parseCookieHeader(value: string | null): Record<string, string> {
  if (!value) return {};
  return Object.fromEntries(value.split("; ").map((pair) => pair.split("=") as [string, string]));
}

describe("proxy — silent-refresh для Server Components/Route Handlers", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("не трогает fetch, если access_token ещё жив", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("access_token=live; refresh_token=whatever"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rewrittenCookieHeader(res)).toBeNull();
  });

  it("не трогает fetch, если нет вообще ни одной cookie (гость)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest(undefined));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rewrittenCookieHeader(res)).toBeNull();
  });

  it("не трогает fetch, если access_token протух, но refresh_token тоже нет", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest(""));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rewrittenCookieHeader(res)).toBeNull();
  });

  it("не пытается рефрешить, если NEXT_PUBLIC_API_URL не задан", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("refresh_token=r1"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rewrittenCookieHeader(res)).toBeNull();
  });

  it("access_token протух, refresh успешен — переписывает и Cookie запроса, и Set-Cookie ответа", async () => {
    const fetchMock = vi.fn(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "access_token=NEW_ACCESS; HttpOnly; Path=/");
      headers.append("set-cookie", "refresh_token=NEW_REFRESH; HttpOnly; Path=/");
      return new Response(null, { status: 200, headers });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("refresh_token=old-refresh"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/auth/refresh");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Cookie).toBe("refresh_token=old-refresh");

    // Текущий рендер (RSC внутри этого же запроса) должен сразу увидеть новую пару.
    expect(parseCookieHeader(rewrittenCookieHeader(res))).toEqual({
      access_token: "NEW_ACCESS",
      refresh_token: "NEW_REFRESH",
    });

    // Браузер должен получить обновлённые cookie на будущее.
    expect(res.cookies.get("access_token")?.value).toBe("NEW_ACCESS");
    expect(res.cookies.get("refresh_token")?.value).toBe("NEW_REFRESH");
  });

  it("пробрасывает реальные User-Agent/X-Forwarded-For браузера в запрос на /refresh", async () => {
    const fetchMock = vi.fn(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "access_token=A; HttpOnly");
      headers.append("set-cookie", "refresh_token=B; HttpOnly");
      return new Response(null, { status: 200, headers });
    });
    vi.stubGlobal("fetch", fetchMock);

    await proxy(
      makeRequest("refresh_token=r1", {
        "user-agent": "Mozilla/5.0 TestBrowser",
        "x-forwarded-for": "203.0.113.7",
      })
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("Mozilla/5.0 TestBrowser");
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("refresh-сессия мертва (401 от express) — остаётся гостем, ничего не переписывает", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("refresh_token=stolen-and-already-rotated"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rewrittenCookieHeader(res)).toBeNull();
    expect(res.cookies.get("access_token")).toBeUndefined();
  });

  it("express недоступен (сеть упала) — не роняет рендер, просто гость", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("refresh_token=r1"));

    expect(rewrittenCookieHeader(res)).toBeNull();
  });

  it("cookie на ответе — secure только в production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn(async () => {
      const headers = new Headers();
      headers.append("set-cookie", "access_token=A; HttpOnly");
      headers.append("set-cookie", "refresh_token=B; HttpOnly");
      return new Response(null, { status: 200, headers });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxy(makeRequest("refresh_token=r1"));

    expect(res.cookies.get("access_token")?.secure).toBe(false);
  });
});
