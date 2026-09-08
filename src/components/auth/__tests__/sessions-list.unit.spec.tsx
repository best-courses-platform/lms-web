import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SessionView } from "@/lib/api/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const revokeSessionMock = vi.fn();
const logoutAllMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({
  revokeSession: revokeSessionMock,
  logoutAll: logoutAllMock,
}));

const { ApiError } = await import("@/lib/api/core");
const { SessionsList } = await import("../sessions-list");

const current: SessionView = {
  id: "session-current",
  current: true,
  createdAt: "2026-09-08T10:00:00.000Z",
  lastUsedAt: "2026-09-08T10:05:00.000Z",
  expiresAt: "2026-10-08T10:00:00.000Z",
  userAgent: "Chrome on macOS",
  ip: "203.0.113.1",
};

const other: SessionView = {
  id: "session-other",
  current: false,
  createdAt: "2026-09-01T10:00:00.000Z",
  lastUsedAt: null,
  expiresAt: "2026-10-01T10:00:00.000Z",
  userAgent: "Safari on iPhone",
  ip: "198.51.100.7",
};

describe("SessionsList", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    revokeSessionMock.mockReset();
    logoutAllMock.mockReset();
  });

  describe("Рендер списка", () => {
    it("должен показать обе сессии, пометить текущую и не дать её завершить кнопкой", () => {
      render(<SessionsList initialSessions={[current, other]} />);

      expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
      expect(screen.getByText("Safari on iPhone")).toBeInTheDocument();
      expect(screen.getByText("Это устройство")).toBeInTheDocument();
      // Только одна кнопка "Завершить" — у текущей сессии её нет вообще.
      expect(screen.getAllByRole("button", { name: "Завершить" })).toHaveLength(1);
    });

    it("должен посчитать число активных сессий с правильным русским склонением", () => {
      render(<SessionsList initialSessions={[current]} />);
      expect(screen.getByText("1 активных сессия")).toBeInTheDocument();
    });
  });

  describe("Завершение чужой сессии", () => {
    it("должен вызвать revokeSession(id) и убрать её из списка при успехе", async () => {
      revokeSessionMock.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current, other]} />);

      await user.click(screen.getByRole("button", { name: "Завершить" }));

      expect(revokeSessionMock).toHaveBeenCalledWith("session-other");
      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Сессия завершена"));
      expect(screen.queryByText("Safari on iPhone")).not.toBeInTheDocument();
      // Текущая сессия остаётся на месте.
      expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    });

    it("должен показать error-toast и оставить сессию в списке при ошибке", async () => {
      revokeSessionMock.mockRejectedValue(new ApiError(404, "Сессия не найдена"));
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current, other]} />);

      await user.click(screen.getByRole("button", { name: "Завершить" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith("Сессия не найдена"));
      expect(screen.getByText("Safari on iPhone")).toBeInTheDocument();
    });
  });

  describe("Выйти отовсюду", () => {
    it("не должен вызывать logoutAll, пока диалог не подтверждён", async () => {
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current]} />);

      await user.click(screen.getByRole("button", { name: "Выйти отовсюду" }));

      expect(logoutAllMock).not.toHaveBeenCalled();
    });

    it("после подтверждения должен вызвать logoutAll() и перейти на /login", async () => {
      logoutAllMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current]} />);

      await user.click(screen.getByRole("button", { name: "Выйти отовсюду" }));
      // Триггер и кнопка подтверждения внутри диалога называются одинаково — берём последнюю
      // (AlertDialogAction в футере, дорисовывается в DOM уже после открытия).
      const buttons = await screen.findAllByRole("button", { name: "Выйти отовсюду" });
      await user.click(buttons[buttons.length - 1]);

      expect(logoutAllMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/login");
      expect(refreshMock).toHaveBeenCalled();
    });

    it("при отмене не должен вызывать logoutAll", async () => {
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current]} />);

      await user.click(screen.getByRole("button", { name: "Выйти отовсюду" }));
      await user.click(await screen.findByRole("button", { name: "Отмена" }));

      expect(logoutAllMock).not.toHaveBeenCalled();
    });

    it("должен показать error-toast и не редиректить, если logoutAll упал", async () => {
      logoutAllMock.mockRejectedValue(new ApiError(500, "Что-то пошло не так"));
      const user = userEvent.setup();
      render(<SessionsList initialSessions={[current]} />);

      await user.click(screen.getByRole("button", { name: "Выйти отовсюду" }));
      const buttons = await screen.findAllByRole("button", { name: "Выйти отовсюду" });
      await user.click(buttons[buttons.length - 1]);

      await waitFor(() => expect(toastError).toHaveBeenCalledWith("Что-то пошло не так"));
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
