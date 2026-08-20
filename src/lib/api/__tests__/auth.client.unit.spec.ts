import { describe, it, expect, vi, beforeEach } from "vitest";
import type { apiClient as ApiClientFn } from "../http-client";

// apiClient замокан — проверяем только то, что auth.client.ts само добавляет к запросу
// (путь, метод, тело), не то, что реально делает fetch (это уже покрыто в
// http-client.unit.spec.ts). Тот же принцип "мокаем непосредственного соседа", что и в
// unit-тестах express-lms (см. Obsidian/8 — repository замокан в *.service.unit.spec.ts).
vi.mock("../http-client", () => ({ apiClient: vi.fn() }));

const { apiClient } = (await import("../http-client")) as unknown as { apiClient: typeof ApiClientFn };
const { login, register, verifyEmail, logout } = await import("../auth.client");

const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

describe("auth.client", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
    mockApiClient.mockResolvedValue({ message: "ok" });
  });

  describe("login", () => {
    it("должен отправить POST на /api/auth/login с email и password в теле", async () => {
      await login("user@example.com", "password123");

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "user@example.com", password: "password123" }),
        })
      );
    });
  });

  describe("register", () => {
    it("должен отправить POST на /api/auth/register с телом как есть", async () => {
      const input = { name: "New", email: "new@example.com", password: "pw123456", confirmPassword: "pw123456" };

      await register(input);

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
      );
    });
  });

  describe("verifyEmail", () => {
    it("должен отправить POST на /api/auth/verify-email с токеном в теле", async () => {
      await verifyEmail("tok-123");

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/auth/verify-email",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "tok-123" }) })
      );
    });
  });

  describe("logout", () => {
    it("должен отправить POST на /api/auth/logout без тела", async () => {
      await logout();

      expect(mockApiClient).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    });
  });
});
