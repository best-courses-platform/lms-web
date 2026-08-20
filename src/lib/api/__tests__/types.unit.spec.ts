import { describe, it, expect } from "vitest";
import { getCourseAuthorId, type Course } from "../types";

// Регрессия на реальную двойственность формы course.author между эндпоинтами express-lms
// (см. комментарий в types.ts): POST /api/courses (create) возвращает author просто строкой
// (ObjectId), а find*-эндпоинты популейтят его до { _id, name, email, avatar }.
describe("getCourseAuthorId", () => {
  describe("Когда author — строка (ответ POST /api/courses)", () => {
    it("должен вернуть её как есть", () => {
      expect(getCourseAuthorId("507f1f77bcf86cd799439011")).toBe("507f1f77bcf86cd799439011");
    });
  });

  describe("Когда author — популейченный объект (ответ find*-эндпоинтов)", () => {
    it("должен вернуть author._id", () => {
      const author: Course["author"] = { _id: "507f1f77bcf86cd799439011", name: "A", email: "a@b.com", avatar: null };
      expect(getCourseAuthorId(author)).toBe("507f1f77bcf86cd799439011");
    });
  });
});
