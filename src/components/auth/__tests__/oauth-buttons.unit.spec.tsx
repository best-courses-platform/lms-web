import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthButtons } from "../oauth-buttons";

describe("OAuthButtons", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  describe("Когда NEXT_PUBLIC_API_URL настроен", () => {
    it("должен отрендерить обычные <a href>, а не onClick — OAuth это редирект браузера, не XHR", () => {
      // Given — см. комментарий в самом oauth-buttons.tsx: провайдер должен получить
      // полноценную навигацию, не fetch-запрос.
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

      // When
      render(<OAuthButtons />);

      // Then
      const google = screen.getByRole("link", { name: "Продолжить с Google" });
      const github = screen.getByRole("link", { name: "Продолжить с GitHub" });
      expect(google).toHaveAttribute("href", "https://api.example.com/api/auth/google");
      expect(github).toHaveAttribute("href", "https://api.example.com/api/auth/github");
    });
  });
});
