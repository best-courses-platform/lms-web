// Прикладные типы — производные от components["schemas"] в schema.gen.ts (сгенерирован
// openapi-typescript из express-lms/openapi.json, см. npm run types:api). Ручные объявления
// остаются только там, где в спеке нет своего именованного компонента (сейчас таких нет).
// Раньше типы переписывались руками с backend-исходников — реальный дрейф уже случался
// (Course.ratings существовал здесь, когда бэкенд давно вынес оценки в отдельную коллекцию
// и оставил только averageRating) — см. Obsidian: Рефакторинг проблем/0, пункт про кодоген.
import type { components } from "./schema.gen";

export type UserRole = components["schemas"]["UserSummary"]["role"];

export type User = components["schemas"]["UserDetail"];

export type SessionView = components["schemas"]["SessionView"];

export type Rating = components["schemas"]["Rating"];

export type Course = components["schemas"]["Course"];

export type Difficulty = Course["difficulty"];

// author — либо чистый ObjectId-строка (ответ create — сервер сам подставляет из токена,
// не популейтит заново), либо популейченный объект (все find*-эндпоинты). Реальный union,
// выраженный в самой спеке (см. courseAuthorSchema в express-lms/src/openapi/courses.openapi.ts) —
// не "усреднённый" вручную тип, как было раньше.
export type CourseAuthor = Extract<Course["author"], object>;

export function getCourseAuthorId(author: Course["author"]): string {
  return typeof author === "string" ? author : author._id;
}

export type Lesson = components["schemas"]["Lesson"];

export type VideoFile = NonNullable<Lesson["videoFile"]>;

export type LessonResource = NonNullable<Lesson["resources"]>[number];

export type LessonResourceType = LessonResource["type"];
