import { describe, it, expect, afterEach } from "vitest";
import { apiUrl, parseResponse, ApiError } from "../core";

// apiUrl/parseResponse — общая часть между apiClient (браузер) и apiServer (Server
// Components), напрямую отражают контракт express-lms/src/middleware/error-handler.ts:
// { error: string, details?: unknown } на любую ошибку. Используем настоящий Response
// (доступен глобально в jsdom-окружении) вместо ручных фейков — эти объекты дешёвы,
// а поведение содержимого .headers/.json() у самодельного фейка легко воспроизвести неточно.
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("apiUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  describe("Когда NEXT_PUBLIC_API_URL не задан", () => {
    it("должен выбросить понятную ошибку", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(() => apiUrl("/api/courses")).toThrow("NEXT_PUBLIC_API_URL");
    });
  });

  describe("Когда NEXT_PUBLIC_API_URL задан", () => {
    it("должен склеить базовый URL и путь без изменений", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
      expect(apiUrl("/api/courses")).toBe("https://api.example.com/api/courses");
    });
  });
});

describe("parseResponse", () => {
  describe("Когда ответ успешный (2xx) и Content-Type: application/json", () => {
    it("должен вернуть распарсенное тело", async () => {
      const res = jsonResponse(200, { user: { id: "1" } });
      await expect(parseResponse<{ user: { id: string } }>(res)).resolves.toEqual({ user: { id: "1" } });
    });
  });

  describe("Когда ответ успешный, но без JSON Content-Type", () => {
    it("должен вернуть null, не пытаясь распарсить тело", async () => {
      const res = new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
      await expect(parseResponse(res)).resolves.toBeNull();
    });

    it("должен вернуть null и для 204 No Content (тела нет вообще)", async () => {
      const res = new Response(null, { status: 204 });
      await expect(parseResponse(res)).resolves.toBeNull();
    });
  });

  describe("Когда ответ неуспешный (не 2xx) с телом { error }", () => {
    it("должен выбросить ApiError с этим сообщением и статусом", async () => {
      const res = jsonResponse(409, { error: "Пользователь с таким email уже существует" });

      await expect(parseResponse(res)).rejects.toMatchObject({
        status: 409,
        message: "Пользователь с таким email уже существует",
      });
    });

    it("должен пробросить error.details в ApiError.details", async () => {
      const res = jsonResponse(400, { error: "Ошибка валидации", details: { field: "email" } });

      const error = (await parseResponse(res).catch((e) => e)) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("Когда ответ неуспешный без тела { error } (например, 500 без JSON)", () => {
    it("должен выбросить ApiError с сообщением по умолчанию, включающим статус", async () => {
      const res = new Response("", { status: 502 });

      await expect(parseResponse(res)).rejects.toMatchObject({
        status: 502,
        message: "Ошибка запроса (502)",
      });
    });
  });

  describe("Когда ответ неуспешный и тело — не валидный JSON", () => {
    it("не должен упасть на самом .json(), а выбросить ApiError с сообщением по умолчанию", async () => {
      const res = new Response("<html>not json</html>", {
        status: 500,
        headers: { "content-type": "application/json" },
      });

      await expect(parseResponse(res)).rejects.toMatchObject({
        status: 500,
        message: "Ошибка запроса (500)",
      });
    });
  });
});
