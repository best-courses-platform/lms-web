// Типы вручную списаны с express-lms/src/modules/{auth,courses,lessons,users}/*.types.ts.
// ObjectId -> string, Date -> string (JSON не знает ни того, ни другого).
// Общего пакета/кодогенерации пока нет (см. roadmap LMS — Swagger/OpenAPI не подключены) —
// синхронизировать с бэкендом вручную при изменении схем.

export type UserRole = "student" | "author" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Rating = {
  userId: string;
  value: number;
  createdAt: string;
};

export type CourseAuthor = {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
};

export type Course = {
  _id: string;
  title: string;
  description: string;
  previewImage: string;
  // Большинство запросов (findById/findAll/findPublished/...) популейтят автора
  // до { _id, name, email, avatar }; POST /api/courses (create) — нет, там просто
  // ObjectId-строка (id, который сам же передал сервер из req.user). Оба варианта
  // реальны, различать по typeof — см. getCourseAuthorId ниже.
  author: string | CourseAuthor;
  tags: string[];
  difficulty: Difficulty;
  lessons?: string[];
  ratings: Rating[];
  averageRating?: number;
  isPublished: boolean;
  allowedUsers: string[];
  createdAt: string;
  updatedAt: string;
};

export type LessonResourceType = "file" | "link" | "video";

export type LessonResource = {
  type: LessonResourceType;
  title: string;
  url?: string;
  description?: string;
  fileSize?: number;
  mimeType?: string;
  originalName?: string;
};

export type VideoFile = {
  url?: string;
  originalName?: string;
  size?: number;
  duration?: number;
  mimeType?: string;
};

export function getCourseAuthorId(author: Course["author"]): string {
  return typeof author === "string" ? author : author._id;
}

export type Lesson = {
  _id: string;
  title: string;
  description: string;
  courseId: string;
  order: number;
  videoFile?: VideoFile;
  resources?: LessonResource[];
  inputExamples?: string;
  outputExamples?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
