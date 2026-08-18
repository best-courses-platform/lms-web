import "server-only";
import { apiServer } from "./http-server";
import type { Lesson } from "./types";

// GET /api/lessons/course/:id — доступ ограничен той же проверкой, что и сам курс
// (courseService.canAccess), поэтому дергаем только после успешного getCourseById.
export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
  const res = await apiServer<{ success: boolean; data: Lesson[] }>(`/api/lessons/course/${courseId}`);
  return res.data;
}

// GET /api/lessons/:id — доступ уже проверен на бэкенде (getLesson сам вызывает
// courseService.canAccess на родительском курсе), здесь просто отдаём/пробрасываем 403/404.
export async function getLessonById(id: string): Promise<Lesson> {
  const res = await apiServer<{ success: boolean; data: Lesson }>(`/api/lessons/${id}`);
  return res.data;
}
