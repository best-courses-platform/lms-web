import "server-only";
import { apiServer } from "./http-server";
import type { Course, Rating } from "./types";

// GET /api/courses/published — публичный список, не требует авторизации.
// Отдаёт голый массив (не { data: [...] }) — так решено в course.controller.ts.
export function getPublishedCourses(): Promise<Course[]> {
  return apiServer<Course[]>("/api/courses/published");
}

// GET /api/courses/:id — может 403 (приватный курс, не автор/не в allowedUsers) или
// 404 (не найден). Оба случая обрабатывает вызывающая страница (courseService.canAccess
// на бэкенде, см. Рефакторинг проблем/4 в express-lms), здесь ошибка просто прокидывается.
export function getCourseById(id: string): Promise<Course> {
  return apiServer<Course>(`/api/courses/${id}`);
}

export function getCourseRatings(id: string): Promise<Rating[]> {
  return apiServer<Rating[]>(`/api/courses/${id}/ratings`);
}
