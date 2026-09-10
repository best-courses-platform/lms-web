import "server-only";
import { apiServer } from "./http-server";
import type { Enrollment } from "./types";

// GET /api/courses/:id/enrollments — только автор курса (403 иначе, см. enrollment.service.ts
// в express-lms). Страница курса вызывает это только когда currentUser — автор, см. page.tsx.
export function getCourseStudents(courseId: string): Promise<Enrollment[]> {
  return apiServer<Enrollment[]>(`/api/courses/${courseId}/enrollments`);
}
