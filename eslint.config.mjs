import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Сгенерированный HTML/JS-отчёт vitest --coverage (см. .gitignore) — не наш код.
    "coverage/**",
    // Артефакты локального запуска Playwright (см. .gitignore) — минифицированный
    // сторонний бандл HTML-репорта, не наш код.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
