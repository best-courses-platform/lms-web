import { test, expect } from "@playwright/test";
import {
  closeDbConnection,
  expireEmailVerificationToken,
  getEmailVerificationToken,
  registerVerifiedAndLogin,
  uniqueEmail,
} from "./helpers";

test.afterAll(async () => {
  await closeDbConnection();
});

test.describe("Регистрация → подтверждение email → логин", () => {
  test("должен провести пользователя по всему циклу и приземлить на /courses", async ({ page }) => {
    // Given/When — реальные формы, реальный backend; e2e/helpers.ts достаёт токен
    // подтверждения напрямую из БД, потому что письма в mock-режиме не отправляются
    // (тот же приём, что и в express-lms/test/helpers.ts для Jest).
    await registerVerifiedAndLogin(page);

    // Then
    await expect(page).toHaveURL("/courses");
    await expect(page.getByRole("heading", { name: "Каталог курсов" })).toBeVisible();
  });

  test("незалогиненный пользователь при попытке зайти на /login/local с неверным паролем должен получить ошибку, не сессию", async ({
    page,
  }) => {
    // Given — регрессия на express-lms/Рефакторинг проблем/17: /login/local раньше обходил
    // проверку email/пароля отдельным путём от /login. Здесь просто неверный пароль —
    // самый дешёвый живой сигнал, что форма реально бьёт в бэкенд, а не подделывает успех.
    const email = uniqueEmail("wrong-pass");
    await page.goto("/register");
    await page.getByLabel("Имя").fill("Wrong Pass User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("password123");
    await page.getByLabel("Повторите пароль").fill("password123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await page.getByText("Проверьте почту").waitFor();

    const token = await getEmailVerificationToken(email);
    await page.goto(`/verify-email?token=${token}`);
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await page.getByText("Email подтверждён").waitFor();

    // When
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();

    // Then
    await expect(page.getByText("Неверный email или пароль")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("после регистрации кнопка повторной отправки должна дойти до бэкенда и показать нейтральное сообщение", async ({
    page,
  }) => {
    // Given — реальная форма и реальный backend; письма в e2e-режиме не отправляются
    // (EMAIL_* пуст), но эндпоинт resend-verification всё равно отвечает 200.
    const email = uniqueEmail("resend");
    await page.goto("/register");
    await page.getByLabel("Имя").fill("Resend User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("password123");
    await page.getByLabel("Повторите пароль").fill("password123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await page.getByText("Проверьте почту").waitFor();

    // When
    await page.getByRole("button", { name: "Отправить письмо повторно" }).click();

    // Then
    await expect(page.getByRole("status")).toContainText("Если этот email ещё не подтверждён");
    await expect(page.getByRole("button", { name: /Отправить повторно через/ })).toBeDisabled();
  });

  test("просроченная ссылка подтверждения должна предложить новую по токену — без ввода email — и новая ссылка должна работать", async ({
    page,
  }) => {
    // Given — ссылка из письма протухла (срок в БД сдвинут в прошлое)
    const email = uniqueEmail("expired-link");
    await page.goto("/register");
    await page.getByLabel("Имя").fill("Expired Link User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("password123");
    await page.getByLabel("Повторите пароль").fill("password123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await page.getByText("Проверьте почту").waitFor();
    const oldToken = await getEmailVerificationToken(email);
    await expireEmailVerificationToken(email);

    // When
    await page.goto(`/verify-email?token=${oldToken}`);
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await expect(page.getByText("Срок действия токена подтверждения истек")).toBeVisible();
    await page.getByRole("button", { name: "Отправить новую ссылку" }).click();
    await expect(page.getByRole("status")).toContainText("Если этот email ещё не подтверждён");

    // Then — бэкенд нашёл аккаунт по просроченному токену и выдал новый; по нему подтверждение проходит
    const newToken = await getEmailVerificationToken(email);
    expect(newToken).not.toBe(oldToken);
    await page.goto(`/verify-email?token=${newToken}`);
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await page.getByText("Email подтверждён").waitFor();
  });
});
