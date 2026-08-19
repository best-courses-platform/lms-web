import "client-only";
import { apiClient } from "./http-client";
import type { Course, Difficulty } from "./types";

// Виджет рейтинга (Client Component) — курс с уже пересчитанным averageRating
// в ответе, страница обновляется через router.refresh(), не отдельным fetch.
export function rateCourse(courseId: string, value: number) {
  return apiClient<{ message: string; course: Course }>(`/api/courses/${courseId}/ratings`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export type CreateCourseInput = {
  title: string;
  description: string;
  previewImage: string;
  tags: string[];
  difficulty: Difficulty;
  isPublished: boolean;
};

// Форма создания курса (Client Component) — author НЕ передаётся, бэкенд берёт его
// из cookie-сессии (см. course.controller.ts#createCourse в express-lms).
export function createCourse(input: CreateCourseInput) {
  return apiClient<{ message: string; course: Course }>("/api/courses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
