import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// next/navigation.useRouter — вне реального Next.js App Router рендера недоступен без
// мока; push/refresh мокаются, чтобы проверить, что LoginForm реально их вызывает после
// успешного входа. login()/ApiError из lib/api замокан — сама сетевая логика уже покрыта
// в auth.client.unit.spec.ts/http-client.unit.spec.ts, здесь важно только поведение формы.
const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const loginMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ login: loginMock }));

const { ApiError } = await import("@/lib/api/core");
const { LoginForm } = await import("../login-form");

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    loginMock.mockReset();
  });

  describe("Когда данные валидны", () => {
    it("должен вызвать login(email, password) и перенаправить на /courses", async () => {
      // Given
      loginMock.mockResolvedValue({ message: "ok", token: "t", user: {} });
      const user = userEvent.setup();
      render(<LoginForm />);

      // When
      await user.type(screen.getByLabelText("Email"), "user@example.com");
      await user.type(screen.getByLabelText("Пароль"), "password123");
      await user.click(screen.getByRole("button", { name: "Войти" }));

      // Then
      await waitFor(() => expect(loginMock).toHaveBeenCalledWith("user@example.com", "password123"));
      expect(pushMock).toHaveBeenCalledWith("/courses");
      expect(refreshMock).toHaveBeenCalled();
    });

    it("должен показать 'Входим...' и задизейблить кнопку, пока запрос выполняется", async () => {
      // Given — контролируемый промис, чтобы поймать промежуточное pending-состояние
      let resolveLogin: (value: unknown) => void = () => {};
      loginMock.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText("Email"), "user@example.com");
      await user.type(screen.getByLabelText("Пароль"), "password123");
      await user.click(screen.getByRole("button", { name: "Войти" }));

      // Then
      expect(screen.getByRole("button", { name: "Входим..." })).toBeDisabled();

      resolveLogin({ message: "ok", token: "t", user: {} });
      await waitFor(() => expect(pushMock).toHaveBeenCalled());
    });
  });

  describe("Когда login() падает с ApiError", () => {
    it("должен показать сообщение ошибки из ApiError и не редиректить", async () => {
      // Given
      loginMock.mockRejectedValue(new ApiError(401, "Неверный email или пароль"));
      const user = userEvent.setup();
      render(<LoginForm />);

      // When
      await user.type(screen.getByLabelText("Email"), "user@example.com");
      await user.type(screen.getByLabelText("Пароль"), "wrong-password");
      await user.click(screen.getByRole("button", { name: "Войти" }));

      // Then
      expect(await screen.findByText("Неверный email или пароль")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  describe("Когда login() падает с не-ApiError ошибкой (например, сеть недоступна)", () => {
    it("должен показать нейтральное сообщение, не текст исходной ошибки", async () => {
      // Given
      loginMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const user = userEvent.setup();
      render(<LoginForm />);

      // When
      await user.type(screen.getByLabelText("Email"), "user@example.com");
      await user.type(screen.getByLabelText("Пароль"), "password123");
      await user.click(screen.getByRole("button", { name: "Войти" }));

      // Then
      expect(await screen.findByText("Не удалось войти, попробуйте ещё раз")).toBeInTheDocument();
    });
  });
});
