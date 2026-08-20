import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../http-client";

// apiClient — тонкая обёртка вокруг fetch для Client Components. Реальный parseResponse уже
// отдельно покрыт в core.unit.spec.ts — здесь проверяется только то, что apiClient добавляет
// сам: credentials: 'include', Content-Type для JSON-тела.
//
// FormData-ветка (Content-Type НЕ должен проставляться для multipart-тела) намеренно не
// протестирована здесь — на момент написания этот код существует только в ещё не смёрженной
// ветке 2_course-lesson-management (загрузка файлов урока), не в main. Тест на неё стоит
// добавить вместе с остальным покрытием courses/lessons, когда та ветка вольётся.
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

  describe("Когда тела нет вообще (GET-запрос)", () => {
    it("не должен проставлять Content-Type", async () => {
      await apiClient("/api/courses");

      const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });
  });
});
