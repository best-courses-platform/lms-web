"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Тонкая обёртка над next-themes — обязательно "use client", т.к. next-themes
// читает/пишет localStorage и класс на <html> на клиенте. Сейчас всегда тёмная
// (enableSystem={false}, defaultTheme="dark", жёстко в layout.tsx) — переключатель
// светлой темы добавляется позже отдельным шагом, инфраструктура уже готова.
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
