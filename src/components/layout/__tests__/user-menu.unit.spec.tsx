import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@/lib/api/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: toastError } }));

const logoutMock = vi.fn();
vi.mock("@/lib/api/auth.client", () => ({ logout: logoutMock }));

const { UserMenu } = await import("../user-menu");

const user: User = { id: "user-1", email: "user@example.com", name: "Ivan Petrov", role: "student" };

describe("UserMenu", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    toastError.mockReset();
    logoutMock.mockReset();
  });

  describe("Аватар", () => {
    it("должен показать инициалы из первых двух слов имени", () => {
      render(<UserMenu user={user} />);
      expect(screen.getByText("IP")).toBeInTheDocument();
    });

    it("должен корректно обработать имя из одного слова", () => {
      render(<UserMenu user={{ ...user, name: "Ivan" }} />);
      expect(screen.getByText("I")).toBeInTheDocument();
    });
  });

  describe("Открытие меню", () => {
    it("должен показать имя, email и пункт 'Личный кабинет' со ссылкой на /dashboard", async () => {
      const userEventInstance = userEvent.setup();
      render(<UserMenu user={user} />);

      await userEventInstance.click(screen.getByRole("button"));

      expect(await screen.findByText("Ivan Petrov")).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
      // DropdownMenuItem asChild рендерит <a>, но Radix явно проставляет role="menuitem"
      // поверх implicit "link" — доступная роль в дереве именно menuitem, не link.
      expect(screen.getByRole("menuitem", { name: "Личный кабинет" })).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("Когда пользователь нажимает 'Выйти' и logout() успешен", () => {
    it("должен вызвать logout(), перейти на / и обновить страницу", async () => {
      logoutMock.mockResolvedValue({ message: "ok" });
      const userEventInstance = userEvent.setup();
      render(<UserMenu user={user} />);

      await userEventInstance.click(screen.getByRole("button"));
      await userEventInstance.click(await screen.findByText("Выйти"));

      expect(logoutMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  describe("Когда logout() падает", () => {
    it("должен показать error-toast и не редиректить", async () => {
      logoutMock.mockRejectedValue(new Error("network down"));
      const userEventInstance = userEvent.setup();
      render(<UserMenu user={user} />);

      await userEventInstance.click(screen.getByRole("button"));
      await userEventInstance.click(await screen.findByText("Выйти"));

      expect(toastError).toHaveBeenCalledWith("Не удалось выйти, попробуйте ещё раз");
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
