import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const registerMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ register: registerMock }));

const { ApiError } = await import("@/lib/api/core");
const { RegisterForm } = await import("../register-form");

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, overrides: Partial<Record<"name" | "email" | "password" | "confirmPassword", string>> = {}) {
  const values = {
    name: "New User",
    email: "new@example.com",
    password: "password123",
    confirmPassword: "password123",
    ...overrides,
  };
  await user.type(screen.getByLabelText("Имя"), values.name);
  await user.type(screen.getByLabelText("Email"), values.email);
  await user.type(screen.getByLabelText("Пароль"), values.password);
  await user.type(screen.getByLabelText("Повторите пароль"), values.confirmPassword);
  await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  describe("Когда регистрация прошла успешно", () => {
    it("должен вызвать register() с введёнными полями и показать экран 'Проверьте почту'", async () => {
      // Given
      registerMock.mockResolvedValue({ message: "ok", user: {} });
      const user = userEvent.setup();
      render(<RegisterForm />);

      // When
      await fillAndSubmit(user, { email: "new@example.com" });

      // Then
      expect(registerMock).toHaveBeenCalledWith({
        name: "New User",
        email: "new@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(await screen.findByText("Проверьте почту")).toBeInTheDocument();
      expect(screen.getByText(/new@example\.com/)).toBeInTheDocument();
    });

    it("не должен показывать саму форму регистрации после успеха (заменяется экраном успеха)", async () => {
      registerMock.mockResolvedValue({ message: "ok", user: {} });
      const user = userEvent.setup();
      render(<RegisterForm />);

      await fillAndSubmit(user);

      expect(await screen.findByText("Проверьте почту")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Зарегистрироваться" })).not.toBeInTheDocument();
    });
  });

  describe("Когда register() падает с ApiError (например, email уже занят)", () => {
    it("должен показать сообщение ошибки и остаться на форме", async () => {
      // Given
      registerMock.mockRejectedValue(new ApiError(409, "Пользователь с таким email уже существует"));
      const user = userEvent.setup();
      render(<RegisterForm />);

      // When
      await fillAndSubmit(user);

      // Then
      expect(await screen.findByText("Пользователь с таким email уже существует")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
    });
  });
});
