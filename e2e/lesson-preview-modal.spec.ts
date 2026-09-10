import { test, expect, type Page } from "@playwright/test";
import { closeDbConnection, registerVerifiedAndLogin } from "./helpers";

test.afterAll(async () => {
  await closeDbConnection();
});

// Курс/урок создаются напрямую через API (page.request — тот же браузерный контекст,
// та же httpOnly cookie, что и у page), не через форму: то, что здесь проверяется —
// поведение intercepting route/@modal, не сами формы создания (уже покрыты courses.spec.ts).
async function createCourseWithLesson(page: Page, courseTitle: string, lessonTitle: string) {
  const courseRes = await page.request.post("http://localhost:3000/api/courses", {
    data: {
      title: courseTitle,
      description: "Курс для E2E-проверки перехватывающего роута предпросмотра урока.",
      previewImage: "https://example.com/preview.png",
      tags: [],
      difficulty: "beginner",
      isPublished: true,
    },
  });
  const { course } = await courseRes.json();

  const lessonRes = await page.request.post(`http://localhost:3000/api/lessons/course/${course._id}`, {
    data: {
      title: lessonTitle,
      description: "Описание урока для проверки модалки предпросмотра.",
      tags: [],
    },
  });
  const { data: lesson } = await lessonRes.json();

  return { courseId: course._id as string, lessonId: lesson._id as string };
}

test.describe("Предпросмотр урока — intercepting route + @modal", () => {
  test("клик по уроку со страницы курса открывает модалку, не покидая страницу курса", async ({ page }) => {
    await registerVerifiedAndLogin(page, { role: "author" });
    const courseTitle = `E2E Modal Course ${Date.now()}`;
    const lessonTitle = `E2E Modal Lesson ${Date.now()}`;
    const { courseId } = await createCourseWithLesson(page, courseTitle, lessonTitle);

    await page.goto(`/courses/${courseId}`);
    await page.getByRole("link", { name: lessonTitle }).click();

    // URL реально переходит на /lessons/[id] (это и есть суть intercepting route — адрес
    // меняется на канонический, хотя рендерится модалка, а не полная страница).
    await page.waitForURL(/\/lessons\/[a-f0-9]{24}$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(lessonTitle)).toBeVisible();
    // Страница курса за модалкой не размонтирована — заголовок курса всё ещё в DOM, просто
    // Radix Dialog помечает фон aria-hidden, пока модалка открыта (ожидаемая изоляция для
    // accessibility, не баг) — getByRole не увидел бы его, обычный CSS-локатор видит.
    await expect(page.locator("h1", { hasText: courseTitle })).toBeAttached();

    await page.keyboard.press("Escape");

    await page.waitForURL(new RegExp(`/courses/${courseId}$`));
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("прямой переход по ссылке на /lessons/:id должен открыть полную страницу, не модалку", async ({ page }) => {
    await registerVerifiedAndLogin(page, { role: "author" });
    const courseTitle = `E2E Full Page Course ${Date.now()}`;
    const lessonTitle = `E2E Full Page Lesson ${Date.now()}`;
    const { lessonId } = await createCourseWithLesson(page, courseTitle, lessonTitle);

    // Полный переход (goto — не клик по <Link>) — то, чего перехватчик не видит.
    await page.goto(`/lessons/${lessonId}`);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: lessonTitle })).toBeVisible();
  });
});
