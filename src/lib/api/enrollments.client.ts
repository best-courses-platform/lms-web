import "client-only";
import { apiClient } from "./http-client";
import type { Enrollment } from "./types";

// Записать студента по email, не по userId — автор курса обычно знает почту студента,
// не его внутренний ObjectId; резолв email→user происходит на сервере (см.
// enrollmentService.enrollByEmail в express-lms).
export function enrollStudent(courseId: string, email: string) {
  return apiClient<{ message: string; enrollment: Enrollment }>(`/api/courses/${courseId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Soft-delete на бэкенде (status: 'revoked') — сама запись не удаляется, см. enrollment.model.ts.
export function unenrollStudent(courseId: string, userId: string) {
  return apiClient<{ message: string }>(`/api/courses/${courseId}/enrollments/${userId}`, { method: "DELETE" });
}
