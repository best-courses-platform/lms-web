import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const resendVerificationMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ resendVerification: resendVerificationMock }));

const { ApiError } = await import("@/lib/api/core");
const { ResendVerification, RESEND_COOLDOWN_SECONDS } = await import("../resend-verification");

const RESEND_LABEL = "Отправить письмо повторно";

describe("ResendVerification", () => {
  beforeEach(() => {
    resendVerificationMock.mockReset();
  });

  describe("Когда email уже известен (экран после регистрации, ошибка на логине)", () => {
    it("должен показать только кнопку, без поля ввода email", () => {
      render(<ResendVerification email="user@example.com" />);

      expect(screen.getByRole("button", { name: RESEND_LABEL })).toBeEnabled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("должен вызвать resendVerification(email) и показать нейтральное сообщение об отправке", async () => {
      // Given — бэкенд отвечает одинаково для любого email (защита от enumeration), поэтому
      // UI не должен утверждать, что письмо точно ушло.
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<ResendVerification email="user@example.com" />);

      // When
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      // Then
      expect(resendVerificationMock).toHaveBeenCalledWith({ email: "user@example.com" });
      expect(await screen.findByRole("status")).toHaveTextContent(/Если этот email ещё не подтверждён/);
    });

    it("должен показать 'Отправляем...' и задизейблить кнопку, пока запрос выполняется", async () => {
      // Given — контролируемый промис, чтобы поймать промежуточное pending-состояние
      let resolveResend: (value: unknown) => void = () => {};
      resendVerificationMock.mockReturnValue(new Promise((resolve) => (resolveResend = resolve)));
      const user = userEvent.setup();
      render(<ResendVerification email="user@example.com" />);

      // When
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      // Then
      expect(screen.getByRole("button", { name: "Отправляем..." })).toBeDisabled();

      await act(async () => resolveResend({ message: "ok" }));
    });
  });

  describe("Пауза между отправками", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("после успешной отправки должна заблокировать кнопку с обратным отсчётом", async () => {
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ResendVerification email="user@example.com" />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      expect(
        await screen.findByRole("button", { name: `Отправить повторно через ${RESEND_COOLDOWN_SECONDS} с` })
      ).toBeDisabled();

      // advanceTimersByTimeAsync + findByRole вместо синхронного getByRole: таймер отсчёта
      // ставится в useEffect уже после коммита, под нагрузкой полного прогона он мог ещё не
      // успеть зарегистрироваться к моменту синхронной проверки.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(
        await screen.findByRole("button", { name: `Отправить повторно через ${RESEND_COOLDOWN_SECONDS - 1} с` })
      ).toBeDisabled();
    });

    it("по истечении паузы должна снова разрешить отправку", async () => {
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ResendVerification email="user@example.com" />);
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));
      await screen.findByRole("button", { name: /Отправить повторно через/ });

      for (let second = 0; second < RESEND_COOLDOWN_SECONDS; second++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }

      expect(await screen.findByRole("button", { name: RESEND_LABEL })).toBeEnabled();
    });
  });

  describe("Когда resendVerification() падает с ApiError (например, 429 от rate limiter)", () => {
    it("должен показать сообщение ошибки, не запускать паузу и оставить кнопку доступной", async () => {
      // Given
      resendVerificationMock.mockRejectedValue(new ApiError(429, "Слишком много запросов, попробуйте позже"));
      const user = userEvent.setup();
      render(<ResendVerification email="user@example.com" />);

      // When
      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      // Then
      expect(await screen.findByRole("alert")).toHaveTextContent("Слишком много запросов, попробуйте позже");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: RESEND_LABEL })).toBeEnabled();
    });
  });

  describe("Когда resendVerification() падает не с ApiError (например, сеть недоступна)", () => {
    it("должен показать нейтральное сообщение, не текст исходной ошибки", async () => {
      resendVerificationMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const user = userEvent.setup();
      render(<ResendVerification email="user@example.com" />);

      await user.click(screen.getByRole("button", { name: RESEND_LABEL }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Не удалось отправить письмо, попробуйте ещё раз");
      expect(alert).not.toHaveTextContent("Failed to fetch");
    });
  });

  describe("Когда передан токен из просроченной ссылки", () => {
    it("должен показать кнопку 'Отправить новую ссылку' и отправить письмо по токену", async () => {
      // Given
      resendVerificationMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<ResendVerification token="expired-token" />);

      // When
      await user.click(screen.getByRole("button", { name: "Отправить новую ссылку" }));

      // Then
      expect(resendVerificationMock).toHaveBeenCalledWith({ token: "expired-token" });
      expect(await screen.findByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });
});
