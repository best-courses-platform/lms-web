import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../http-client";

vi.mock("../token-refresh", () => ({
  refreshAccessToken: vi.fn(),
}));
import { refreshAccessToken } from "../token-refresh";

// apiClient — тонкая обёртка вокруг fetch для Client Components. Реальный parseResponse уже
// отдельно покрыт в core.unit.spec.ts — здесь проверяется только то, что apiClient добавляет
// сам: credentials: 'include', Content-Type для JSON-тела, и (регрессия) НЕ проставляет
// Content-Type для FormData — иначе браузер не сможет распарсить собственное
// multipart-тело (см. комментарий в самом http-client.ts).
describe("apiClient", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }))
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  describe("Когда тело — обычный объект (JSON)", () => {
    it("должен выставить Content-Type: application/json и credentials: include", async () => {
      await apiClient("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "a@b.com" }) });

      const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.example.com/api/auth/login");
      expect(init.credentials).toBe("include");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });
  });

  describe("Когда тело — FormData (загрузка файла)", () => {
    it("не должен проставлять Content-Type — браузер сам выставит его с boundary", async () => {
      const formData = new FormData();
      formData.append("file", new Blob(["x"]), "test.txt");

      await apiClient("/api/lessons/1/files", { method: "POST", body: formData });

      const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });
  });

  describe("Когда тела нет вообще (GET-запрос)", () => {
    it("не должен проставлять Content-Type", async () => {
      await apiClient("/api/courses");

      const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });
  });
});

// Silent-refresh: access-токен короткоживущий (15 минут, express-lms/Рефакторинг проблем/31),
// протухнуть посреди работы с открытой вкладкой — штатная ситуация. apiClient должен сам
// освежить его и повторить запрос ровно один раз, а не отдавать 401 наверх компоненту.
describe("apiClient — silent-refresh на 401", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;
  const refreshMock = vi.mocked(refreshAccessToken);

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    refreshMock.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.unstubAllGlobals();
  });

  it("на 401 сначала пробует refreshAccessToken(), затем повторяет исходный запрос один раз", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })
      );
    vi.stubGlobal("fetch", fetchMock);
    refreshMock.mockResolvedValue(true);

    const result = await apiClient<{ ok: boolean }>("/api/courses/my");

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });

  it("если refresh тоже не удался — отдаёт исходную 401-ошибку, не зацикливается", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    refreshMock.mockResolvedValue(false);

    await expect(apiClient("/api/courses/my")).rejects.toMatchObject({ status: 401 });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // retry не делаем, если refresh сам провалился
  });

  it("не трогает /api/auth/login — 401 там значит неверный пароль, а не протухший токен", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient("/api/auth/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });

    expect(refreshMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("не трогает /api/auth/refresh — неудачный refresh не пытается освежить сам себя", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient("/api/auth/refresh", { method: "POST" })).rejects.toMatchObject({ status: 401 });

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("не пытается рефрешить дважды подряд на один и тот же запрос (защита от цикла)", async () => {
    // Гипотетический случай: refresh вернул true, но повторный запрос ВСЁ РАВНО получил 401
    // (сессия отозвана прямо между refresh и retry) — не должны уйти в бесконечный цикл.
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    refreshMock.mockResolvedValue(true);

    await expect(apiClient("/api/courses/my")).rejects.toMatchObject({ status: 401 });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("успешный ответ (не 401) не трогает refreshAccessToken вообще", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }))
    );

    await apiClient("/api/courses");

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
