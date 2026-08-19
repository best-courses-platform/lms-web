import "client-only";
import { apiClient } from "./http-client";
import type { Lesson } from "./types";

export type CreateLessonInput = {
  title: string;
  description: string;
  tags: string[];
};

// order НЕ передаётся — бэкенд сам считает следующий порядковый номер и сам добавляет
// урок в course.lessons (см. createLessonForCourse в express-lms).
export function createLesson(courseId: string, input: CreateLessonInput) {
  return apiClient<{ success: boolean; message: string; data: Lesson }>(`/api/lessons/course/${courseId}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type LessonFileType = "video" | "resource";

// video: PUT-семантика на бэкенде — новая загрузка сама заменяет старое видео
// (и чистит его из S3, см. handleVideoUpload в lesson.service.ts). resource: добавляется
// в список, либо заменяет ресурс с тем же title, если он уже есть.
export function uploadLessonFile(
  lessonId: string,
  file: File,
  fileType: LessonFileType,
  options?: { title?: string; description?: string }
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileType", fileType);
  if (options?.title) {
    formData.append("title", options.title);
  }
  if (options?.description) {
    formData.append("description", options.description);
  }

  const path = fileType === "video" ? `/api/lessons/${lessonId}/files/video` : `/api/lessons/${lessonId}/files/resource`;

  return apiClient<{ success: boolean; message: string; data: Lesson; fileUrl: string }>(path, {
    method: "POST",
    body: formData,
  });
}

export function deleteLessonFile(lessonId: string, fileUrl: string, fileType: LessonFileType) {
  return apiClient<{ success: boolean; message: string; data: Lesson }>(`/api/lessons/${lessonId}/files`, {
    method: "DELETE",
    body: JSON.stringify({ fileUrl, fileType }),
  });
}

export function deleteLessonResource(lessonId: string, resourceIndex: number) {
  return apiClient<{ success: boolean; message: string; data: Lesson }>(
    `/api/lessons/${lessonId}/resources/${resourceIndex}`,
    { method: "DELETE" }
  );
}
