import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const verifyEmailMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ verifyEmail: verifyEmailMock }));

const { ApiError } = await import("@/lib/api/core");
const { VerifyEmailForm } = await import("../verify-email-form");

describe("VerifyEmailForm", () => {
  beforeEach(() => {
    verifyEmailMock.mockReset();
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
