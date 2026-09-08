import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { refreshAccessToken } from "../token-refresh";

describe("refreshAccessToken", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  it("бьёт в POST /api/auth/refresh с credentials: include и возвращает true на 200", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const ok = await refreshAccessToken();

    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/api/auth/refresh");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("возвращает false на 401 (сессия отозвана/протухла)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    await expect(refreshAccessToken()).resolves.toBe(false);
  });

  it("возвращает false, а не бросает, если сеть недоступна", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(refreshAccessToken()).resolves.toBe(false);
  });

  it("дедуплицирует конкурентные вызовы — один реальный fetch на несколько одновременных обращений", async () => {
    let resolveFetch!: (res: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const call1 = refreshAccessToken();
    const call2 = refreshAccessToken();
    const call3 = refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(new Response(null, { status: 200 }));

    await expect(Promise.all([call1, call2, call3])).resolves.toEqual([true, true, true]);
  });

  it("следующий вызов после завершения предыдущего снова бьёт в сеть (не залипает в дедупликации навсегда)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await refreshAccessToken();
    await refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
