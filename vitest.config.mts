import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Async Server Components (см. app/dashboard/page.tsx и т.п.) Vitest тестировать не может —
// официальная позиция Next.js: "recommend E2E tests for async components" (node_modules/next/
// dist/docs/01-app/02-guides/testing/vitest.md). Этот слой намеренно вне охвата unit-тестов
// здесь — только клиентские компоненты ("use client"), src/lib/api/*.client.ts и чистые
// утилиты. Реальные страницы/навигация и async Server Components — под Playwright
// (см. e2e/, playwright.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Нативное разрешение путей из tsconfig.json (@/* -> src/*) — начиная с этой версии
    // Vite/Vitest отдельный плагин vite-tsconfig-paths больше не нужен.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Vitest по умолчанию матчит любой **/*.spec.ts, включая e2e/*.spec.ts — а это
    // Playwright-тесты (свои test/expect из @playwright/test, реальный Page), под Vitest
    // они не то что "не проходят", а падают на самом импорте/типах. configDefaults.exclude —
    // чтобы не потерять штатные исключения (node_modules и т.п.), только дополнить их.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/__tests__/**",
        // shadcn-сгенерированные примитивы — сторонний, не наш код по сути, обновляется
        // через `shadcn add`, а не пишется вручную; тестировать нечего.
        "src/components/ui/**",
        // async Server Components — вне охвата Vitest, см. комментарий выше.
        "src/app/**",
        // "server-only" (см. package server-only) безусловно throw'ит при импорте вне
        // Next.js webpack-сборки — под Vitest (Vite, не webpack) падает всегда, без
        // спецобработки. Плюс next/headers cookies() — Next-рантайм API, недоступно вне
        // реального сервера. Тот же класс ограничения, что и у async Server Components —
        // требует Playwright/интеграционного слоя, не юнит-теста.
        // Паттерн без ведущей точки — покрывает и auth.server.ts/courses.server.ts/
        // lessons.server.ts, и http-server.ts (дефис, не точка перед "server").
        "src/lib/api/*server.ts",
        // SiteHeader — async Server Component (нет "use client"), транзитивно импортирует
        // lib/api/auth.server.ts (import "server-only") через getCurrentUser() — тот же
        // класс ограничения, что и async-страницы в src/app/**, просто лежит не под app/.
        "src/components/layout/site-header.tsx",
      ],
    },
  },
});
