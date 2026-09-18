import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const registerMock = vi.fn();
const resendVerificationMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ register: registerMock, resendVerification: resendVerificationMock }));

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
    resendVerificationMock.mockReset();
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
      expect(screen.getByText("n***@example.com")).toBeInTheDocument();
      expect(screen.queryByText(/new@example\.com/)).not.toBeInTheDocument();
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

  describe("Когда в адресе опечатка", () => {
    it("кнопка 'Изменить' на экране 'Проверьте почту' должна вернуть форму с заполненным email для правки", async () => {
      // Given
      registerMock.mockResolvedValue({ message: "ok", user: {} });
      const user = userEvent.setup();
      render(<RegisterForm />);
      await fillAndSubmit(user, { email: "typo@exmaple.com" });
      await screen.findByText("Проверьте почту");

      // When
      await user.click(screen.getByRole("button", { name: /Указали не тот email\? Изменить/ }));

      // Then — поля не потеряны, человеку не нужно вводить всё заново
      expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toHaveValue("typo@exmaple.com");
      expect(screen.getByLabelText("Имя")).toHaveValue("New User");
    });
  });

  describe("Когда письмо с подтверждением не пришло", () => {
    it("на экране 'Проверьте почту' должна быть кнопка повторной отправки на введённый email", async () => {
      // Given
      registerMock.mockResolvedValue({ message: "ok", user: {} });
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<RegisterForm />);
      await fillAndSubmit(user, { email: "new@example.com" });
      await screen.findByText("Проверьте почту");

      // When
      await user.click(screen.getByRole("button", { name: "Отправить письмо повторно" }));

      // Then
      expect(resendVerificationMock).toHaveBeenCalledWith({ email: "new@example.com" });
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
