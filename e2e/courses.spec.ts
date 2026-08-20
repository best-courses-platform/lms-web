import { test, expect } from "@playwright/test";
import { closeDbConnection, registerVerifiedAndLogin } from "./helpers";

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Создание курса автором", () => {
  test("автор должен создать курс через форму и увидеть его на собственной странице", async ({ page }) => {
    // Given — регистрация+подтверждение+повышение до author напрямую в БД (то же самое,
    // что registerVerifiedUser(app, { role: 'author' }) делает в express-lms/test/helpers.ts —
    // роль на бэкенде всё равно проставляется только через сервер/БД, не через форму,
    // как и должно быть).
    await registerVerifiedAndLogin(page, { role: "author" });
    const courseTitle = `E2E Course ${Date.now()}`;

    // When
    await page.goto("/courses/new");
    await page.getByLabel("Название").fill(courseTitle);
    await page
      .getByLabel("Описание")
      .fill("Курс, созданный автоматическим E2E-тестом — достаточно длинное описание для валидации.");

    await page.getByLabel("Обложка").setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      // Минимальный валидный PNG (1x1, прозрачный) — содержимое файла бэкенду не важно,
      // в mock-режиме (SELECTEL_* пустые в express-lms/test/setupTestEnv.ts) он просто
      // вернёт mock://-ссылку, не проверяя реальный формат.
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    });
    await expect(page.getByText("Загружаем...")).toBeHidden({ timeout: 15_000 });

    await page.getByLabel("Теги").fill("e2e-tag");
    await page.getByLabel("Теги").press("Enter");

    await page.getByRole("button", { name: "Создать курс" }).click();

    // Then — форма редиректит на /courses/:id после успешного createCourse()
    await page.waitForURL(/\/courses\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { name: courseTitle })).toBeVisible();
    await expect(page.getByText("e2e-tag")).toBeVisible();
    // Курс создаётся с isPublished: false по умолчанию (форма не трогала переключатель) —
    // автор видит собственный черновик через canAccess (author-ветка), не публичный доступ.
    // Button asChild рендерит реальный <Link> без переопределения роли (в отличие от Radix
    // DropdownMenuItem, см. Obsidian) — доступная роль здесь "link", не "button".
    await expect(page.getByRole("link", { name: "Редактировать" })).toBeVisible();
  });
});
