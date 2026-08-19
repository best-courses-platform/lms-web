"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Тонкая обёртка над next-themes — обязательно "use client", т.к. next-themes
// читает/пишет localStorage и класс на <html> на клиенте. defaultTheme="dark" в
// layout.tsx — новый гость видит тёмную тему, переключатель (ThemeToggle в хедере)
// сохраняет выбор в localStorage. enableSystem={false} — осознанно, без варианта
// "как в системе": простой light/dark toggle, не трёхпозиционный переключатель.

// next-themes рендерит инлайновый <script>, чтобы подставить тему до гидратации
// и не словить мигание не той темой (FOUC). React 19 ругается на любой <script>
// внутри компонента — предупреждение ложное, скрипт корректно исполняется через
// SSR-HTML. Библиотека не обновлялась с марта 2025, апстрим-фикса нет (см.
// https://github.com/pacocoursey/next-themes/issues/387). Тот же точечный фильтр
// предлагает сам shadcn/ui в незамерженном PR https://github.com/shadcn-ui/ui/pull/10252 —
// глушит только этот текст, только в dev, только на клиенте, ничего больше не прячет.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
