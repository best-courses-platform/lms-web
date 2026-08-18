import "client-only";
import { apiClient } from "./http-client";
import type { Course } from "./types";

// Виджет рейтинга (Client Component) — курс с уже пересчитанным averageRating
// в ответе, страница обновляется через router.refresh(), не отдельным fetch.
export function rateCourse(courseId: string, value: number) {
  return apiClient<{ message: string; course: Course }>(`/api/courses/${courseId}/ratings`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}
