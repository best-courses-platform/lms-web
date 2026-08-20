import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setThemeMock = vi.fn();
let resolvedTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme: setThemeMock }),
}));

const { ThemeToggle } = await import("../theme-toggle");

// resolvedTheme недоступен до "маунта" на клиенте — но под RTL (полноценный клиентский
// рендер без реального SSR/гидратации) useSyncExternalStore сразу использует клиентский
// snapshot, mounted становится true уже к моменту первого рендера теста, поэтому здесь
// проверяется только смонтированное состояние (сама SSR/FOUC-защита — не тестируемая
// юнитом часть, требует реальной гидратации, см. Obsidian).
describe("ThemeToggle", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
  });

  describe("Когда текущая тема — light", () => {
    it('должен показать label "Включить тёмную тему" и переключать на dark по клику', async () => {
      resolvedTheme = "light";
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole("button", { name: "Включить тёмную тему" });
      await user.click(button);

      expect(setThemeMock).toHaveBeenCalledWith("dark");
    });
  });

  describe("Когда текущая тема — dark", () => {
    it('должен показать label "Включить светлую тему" и переключать на light по клику', async () => {
      resolvedTheme = "dark";
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = screen.getByRole("button", { name: "Включить светлую тему" });
      await user.click(button);

      expect(setThemeMock).toHaveBeenCalledWith("light");
    });
  });
});
