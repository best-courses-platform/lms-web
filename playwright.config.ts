import path from "path";
import { defineConfig, devices } from "@playwright/test";

// Настоящий E2E: реальный express-lms (поднят через test/e2eServer.ts на его стороне —
// эфемерная MongoDB через mongodb-memory-server, тот же приём, что уже используют его
// собственные Jest-интеграционные тесты) + реальный next dev этого проекта. Никакого мока
// API — вся ценность E2E именно в проверке настоящего контракта между фронтом и бэком
// (см. Obsidian: реальные баги в этой платформе не раз были расхождением формы ответа/
// контракта, которое юнит-тесты с моками принципиально не видят).
//
// webServer — массив: Playwright поднимает оба процесса сам и ждёт, пока каждый ответит по
// своему url, прежде чем начать тесты. express-lms — соседний репозиторий (сиблинг-папка,
// не npm-пакет), путь через path.resolve, не строкой "../express-lms" — не зависит от того,
// откуда реально запущена команда.
const EXPRESS_LMS_DIR = path.resolve(__dirname, "../express-lms");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    // "on-first-retry" — трасса (то, что рисует таймлайн/Actions/скриншоты в --ui и в
    // HTML-отчёте) пишется только для тестов, которые пришлось перезапускать — экономит
    // место на CI, где основная цель именно диагностика падений. Локально, под --ui,
    // это означало пустой about:blank и пустой список Actions для ЛЮБОГО теста, который
    // прошёл с первого раза — а локально с --ui обычно смотрят именно "как это работало",
    // не только падения. "on" — трасса пишется всегда, локально это то, что нужно.
    trace: process.env.CI ? "on-first-retry" : "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run e2e:server",
      cwd: EXPRESS_LMS_DIR,
      url: "http://localhost:3000/api/courses",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
