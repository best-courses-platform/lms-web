import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const verifyEmailMock = vi.fn();
const resendVerificationMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ verifyEmail: verifyEmailMock, resendVerification: resendVerificationMock }));

const { ApiError } = await import("@/lib/api/core");
const { VerifyEmailForm } = await import("../verify-email-form");

describe("VerifyEmailForm", () => {
  beforeEach(() => {
    verifyEmailMock.mockReset();
    resendVerificationMock.mockReset();
    searchParams = new URLSearchParams();
  });

  describe("Когда в URL уже есть ?token=...", () => {
    it("должен предзаполнить поле токена значением из query-параметра", () => {
      // Given — регрессия: именно так работает переход по ссылке из письма подтверждения.
      searchParams = new URLSearchParams("token=from-link-abc123");

      // When
      render(<VerifyEmailForm />);

      // Then
      expect(screen.getByLabelText("Токен")).toHaveValue("from-link-abc123");
    });
  });

  describe("Когда токена в URL нет", () => {
    it("поле токена должно быть пустым, пользователь может ввести вручную", () => {
      render(<VerifyEmailForm />);
      expect(screen.getByLabelText("Токен")).toHaveValue("");
    });
  });

  describe("Пока подтверждение не пробовали", () => {
    it("не должен показывать кнопку повторной отправки и поле email — только подсказку про вход", () => {
      // Given/When
      render(<VerifyEmailForm />);

      // Then — без контекста (нет ни email, ни отклонённого токена) отправить письмо нельзя;
      // путь для "письмо не пришло" — вход, там email известен (см. LoginForm).
      expect(screen.queryByRole("button", { name: /Отправить/ })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "войти" })).toHaveAttribute("href", "/login");
    });
  });

  describe("Когда бэкенд отклонил токен (400 — неверный или просроченный)", () => {
    it("должен предложить отправить новую ссылку и отправить её по токену, без ввода email", async () => {
      // Given
      searchParams = new URLSearchParams("token=expired-token-abc");
      verifyEmailMock.mockRejectedValue(new ApiError(400, "Срок действия токена подтверждения истек"));
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<VerifyEmailForm />);

      // When
      await user.click(screen.getByRole("button", { name: "Подтвердить" }));
      await user.click(await screen.findByRole("button", { name: "Отправить новую ссылку" }));

      // Then
      expect(screen.getByText("Срок действия токена подтверждения истек")).toBeInTheDocument();
      expect(resendVerificationMock).toHaveBeenCalledWith({ token: "expired-token-abc" });
      expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    });

    it("не должен предлагать новую ссылку при ошибке не из-за токена (например, сервер недоступен)", async () => {
      searchParams = new URLSearchParams("token=some-token");
      verifyEmailMock.mockRejectedValue(new ApiError(503, "Сервис недоступен"));
      const user = userEvent.setup();
      render(<VerifyEmailForm />);

      await user.click(screen.getByRole("button", { name: "Подтвердить" }));

      expect(await screen.findByText("Сервис недоступен")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Отправить новую ссылку" })).not.toBeInTheDocument();
    });
  });

  describe("Когда подтверждение прошло успешно", () => {
    it("должен вызвать verifyEmail(token) и показать экран 'Email подтверждён'", async () => {
      // Given
      verifyEmailMock.mockResolvedValue({ message: "ok", user: {} });
      const user = userEvent.setup();
      render(<VerifyEmailForm />);

      // When
      await user.type(screen.getByLabelText("Токен"), "manual-token");
      await user.click(screen.getByRole("button", { name: "Подтвердить" }));

      // Then
      expect(verifyEmailMock).toHaveBeenCalledWith("manual-token");
      expect(await screen.findByText("Email подтверждён")).toBeInTheDocument();
    });
  });

  describe("Когда verifyEmail() падает с ApiError (просроченный/неверный токен)", () => {
    it("должен показать сообщение ошибки и остаться на форме", async () => {
      verifyEmailMock.mockRejectedValue(new ApiError(400, "Неверный токен подтверждения"));
      const user = userEvent.setup();
      render(<VerifyEmailForm />);

      await user.type(screen.getByLabelText("Токен"), "garbage");
      await user.click(screen.getByRole("button", { name: "Подтвердить" }));

      expect(await screen.findByText("Неверный токен подтверждения")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
    });
  });
});
