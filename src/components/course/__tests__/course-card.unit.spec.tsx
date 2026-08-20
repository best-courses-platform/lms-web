import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "../course-card";
import type { Course } from "@/lib/api/types";

function createCourse(overrides: Partial<Course> = {}): Course {
  return {
    _id: "course-1",
    title: "Test Course",
    description: "A test course description",
    previewImage: "https://example.com/preview.png",
    author: "author-1",
    tags: [],
    difficulty: "beginner",
    ratings: [],
    isPublished: true,
    allowedUsers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("CourseCard", () => {
  describe("Базовый рендер", () => {
    it("должен вести на /courses/:id и показать title/description", () => {
      render(<CourseCard course={createCourse({ _id: "course-42", title: "My Course" })} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/courses/course-42");
      expect(screen.getByText("My Course")).toBeInTheDocument();
    });
  });

  describe("Когда тегов больше MAX_VISIBLE_TAGS (3)", () => {
    it("должен показать первые 3 тега и счётчик скрытых", () => {
      render(<CourseCard course={createCourse({ tags: ["a", "b", "c", "d", "e"] })} />);

      expect(screen.getByText("a")).toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
      expect(screen.getByText("c")).toBeInTheDocument();
      expect(screen.queryByText("d")).not.toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  describe("Когда тегов 3 или меньше", () => {
    it("не должен показывать счётчик скрытых тегов", () => {
      render(<CourseCard course={createCourse({ tags: ["a", "b"] })} />);
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });
  });

  describe("Когда averageRating задан и больше 0", () => {
    it("должен показать рейтинг с одним знаком после запятой", () => {
      render(<CourseCard course={createCourse({ averageRating: 4.567 })} />);
      expect(screen.getByText("4.6")).toBeInTheDocument();
    });
  });

  describe.each([[undefined], [0]])("Когда averageRating отсутствует или равен 0 (%s)", (rating) => {
    it("не должен показывать блок рейтинга", () => {
      render(<CourseCard course={createCourse({ averageRating: rating })} />);
      expect(screen.queryByText(/^\d\.\d$/)).not.toBeInTheDocument();
    });
  });

  describe("Когда курс не опубликован", () => {
    it('должен показать бейдж "Черновик"', () => {
      render(<CourseCard course={createCourse({ isPublished: false })} />);
      expect(screen.getByText("Черновик")).toBeInTheDocument();
    });
  });

  describe("Когда курс опубликован", () => {
    it('не должен показывать бейдж "Черновик" — публичный каталог не должен на него намекать', () => {
      render(<CourseCard course={createCourse({ isPublished: true })} />);
      expect(screen.queryByText("Черновик")).not.toBeInTheDocument();
    });
  });
});
