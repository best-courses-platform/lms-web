import fs from "fs";
import path from "path";
import { MongoClient, type Db } from "mongodb";
import type { Page } from "@playwright/test";

// express-lms/test/e2eServer.ts публикует реальный URI своей эфемерной MongoDB (mongodb-
// memory-server) в этот файл после старта — тот же приём, что и registerVerifiedUser в
// express-lms/test/helpers.ts использует для Jest-интеграционных тестов (читает токен
// подтверждения email напрямую из БД, раз реальные письма в mock-режиме не отправляются),
// только здесь через отдельный процесс, а не require() в одном и том же тестовом воркере.
const MONGO_URI_FILE = path.resolve(__dirname, "../../express-lms/test/.e2e-mongo-uri");

let client: MongoClient | null = null;

async function getDb(): Promise<Db> {
  if (!client) {
    if (!fs.existsSync(MONGO_URI_FILE)) {
      throw new Error(
        `e2e setup: ${MONGO_URI_FILE} не найден — express-lms/test/e2eServer.ts должен был его создать при старте (см. webServer в playwright.config.ts)`
      );
    }
    const uri = fs.readFileSync(MONGO_URI_FILE, "utf-8").trim();
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db();
}

export async function closeDbConnection(): Promise<void> {
  await client?.close();
  client = null;
}

export async function getEmailVerificationToken(email: string): Promise<string> {
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (!user?.emailVerificationToken) {
    throw new Error(`e2e setup: verification token not found for ${email}`);
  }
  return user.emailVerificationToken as string;
}

export async function promoteToAuthor(email: string): Promise<void> {
  const db = await getDb();
  await db.collection("users").updateOne({ email: email.toLowerCase() }, { $set: { role: "author" } });
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

// Регистрация + подтверждение email + опциональное повышение роли + логин через реальный UI —
// зеркало registerVerifiedUser/loginAgent из express-lms/test/helpers.ts, только через
// браузер, а не HTTP-клиент напрямую: golden path, который реально проходит пользователь,
// не короткий путь мимо форм.
export async function registerVerifiedAndLogin(
  page: Page,
  overrides: { name?: string; email?: string; password?: string; role?: "student" | "author" } = {}
): Promise<{ name: string; email: string; password: string }> {
  const name = overrides.name ?? "E2E User";
  const email = overrides.email ?? uniqueEmail("e2e-user");
  const password = overrides.password ?? "password123";

  await page.goto("/register");
  await page.getByLabel("Имя").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByLabel("Повторите пароль").fill(password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await page.getByText("Проверьте почту").waitFor();

  if (overrides.role === "author") {
    await promoteToAuthor(email);
  }

  const token = await getEmailVerificationToken(email);
  await page.goto(`/verify-email?token=${token}`);
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await page.getByText("Email подтверждён").waitFor();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL("/courses");

  return { name, email, password };
}
