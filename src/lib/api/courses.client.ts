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

// Загрузка обложки курса — отдельно от создания курса (на момент загрузки курса ещё
// нет в БД, id для привязки нет). Возвращает публичный S3-URL, который дальше кладётся
// в previewImage при вызове createCourse.
export function uploadCoursePreviewImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient<{ message: string; url: string }>("/api/courses/preview-image", {
    method: "POST",
    body: formData,
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

// PATCH принимает частичный набор полей (updateCourseSchema — courseBaseSchema.partial()),
// но форма редактирования всегда шлёт все поля разом — так же просто, как create,
// и не нужно отдельно отслеживать, что именно из полей реально изменилось.
export function updateCourse(id: string, input: CreateCourseInput) {
  return apiClient<{ message: string; course: Course }>(`/api/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Удаляет курс вместе со всеми его уроками и их файлами в S3 (каскад — на бэкенде,
// см. courseService.delete → lessonService.deleteAllForCourse в express-lms).
export function deleteCourse(id: string) {
  return apiClient<{ message: string }>(`/api/courses/${id}`, { method: "DELETE" });
}
