import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../theme-provider";

// Тонкая обёртка над next-themes — сам next-themes (localStorage, класс на <html>,
// FOUC-защита через инлайновый script) не наш код и не тестируется здесь. Проверяем
// только то, что действительно наше: проброс children.
describe("ThemeProvider", () => {
  it("должен отрендерить children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <p>content</p>
      </ThemeProvider>
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
