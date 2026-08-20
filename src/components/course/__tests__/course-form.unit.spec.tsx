import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Course } from "@/lib/api/types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

const createCourseMock = vi.fn();
const updateCourseMock = vi.fn();
const uploadCoursePreviewImageMock = vi.fn();
vi.mock("@/lib/api/courses.client", () => ({
  createCourse: createCourseMock,
  updateCourse: updateCourseMock,
  uploadCoursePreviewImage: uploadCoursePreviewImageMock,
}));

const { ApiError } = await import("@/lib/api/core");
const { CourseForm } = await import("../course-form");

function createCourse(overrides: Partial<Course> = {}): Course {
  return {
    _id: "course-1",
    title: "Existing Course",
    description: "Existing description long enough",
    previewImage: "https://example.com/existing.png",
    author: "author-1",
    tags: ["existing-tag"],
    difficulty: "intermediate",
    ratings: [],
    isPublished: true,
    allowedUsers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function uploadPreviewImage(user: ReturnType<typeof userEvent.setup>) {
  uploadCoursePreviewImageMock.mockResolvedValue({ message: "ok", url: "https://s3/uploaded.png" });
  const file = new File(["x"], "cover.png", { type: "image/png" });
  await user.upload(screen.getByLabelText("Обложка"), file);
}

describe("CourseForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastSuccess.mockReset();
    createCourseMock.mockReset();
    updateCourseMock.mockReset();
    uploadCoursePreviewImageMock.mockReset();
  });

  describe("Режим создания (course не передан)", () => {
    it("должен рендериться с пустыми полями и кнопкой 'Создать курс'", () => {
      render(<CourseForm />);

      expect(screen.getByLabelText("Название")).toHaveValue("");
      expect(screen.getByRole("button", { name: "Создать курс" })).toBeInTheDocument();
    });

    it("должен требовать обложку перед отправкой — не вызывать createCourse без неё", async () => {
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.type(screen.getByLabelText("Название"), "New Course");
      await user.type(screen.getByLabelText("Описание"), "A sufficiently long description here.");
      await user.click(screen.getByRole("button", { name: "Создать курс" }));

      expect(await screen.findByText("Загрузите обложку курса")).toBeInTheDocument();
      expect(createCourseMock).not.toHaveBeenCalled();
    });

    it("должен загрузить обложку и показать превью после успешной загрузки", async () => {
      const user = userEvent.setup();
      render(<CourseForm />);

      await uploadPreviewImage(user);

      expect(uploadCoursePreviewImageMock).toHaveBeenCalledWith(expect.any(File));
      expect(await screen.findByAltText("")).toHaveAttribute("src", "https://s3/uploaded.png");
    });

    it("должен показать ошибку загрузки обложки, если uploadCoursePreviewImage упал с ApiError", async () => {
      uploadCoursePreviewImageMock.mockRejectedValue(new ApiError(400, "Файл слишком большой"));
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.upload(screen.getByLabelText("Обложка"), new File(["x"], "cover.png", { type: "image/png" }));

      expect(await screen.findByText("Файл слишком большой")).toBeInTheDocument();
    });

    it("должен создать курс с загруженной обложкой и перейти на страницу курса", async () => {
      // Given
      createCourseMock.mockResolvedValue({ message: "ok", course: { _id: "new-course-id" } });
      const user = userEvent.setup();
      render(<CourseForm />);

      // When
      await user.type(screen.getByLabelText("Название"), "New Course");
      await user.type(screen.getByLabelText("Описание"), "A sufficiently long description here.");
      await uploadPreviewImage(user);
      await screen.findByAltText("");
      await user.click(screen.getByRole("button", { name: "Создать курс" }));

      // Then
      expect(createCourseMock).toHaveBeenCalledWith({
        title: "New Course",
        description: "A sufficiently long description here.",
        previewImage: "https://s3/uploaded.png",
        tags: [],
        difficulty: "beginner",
        isPublished: false,
      });
      expect(toastSuccess).toHaveBeenCalledWith("Курс создан");
      expect(pushMock).toHaveBeenCalledWith("/courses/new-course-id");
    });

    it("должен показать сообщение ошибки, если создание упало с ApiError, и не редиректить", async () => {
      createCourseMock.mockRejectedValue(new ApiError(409, "Курс с таким названием уже существует"));
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.type(screen.getByLabelText("Название"), "Dup");
      await user.type(screen.getByLabelText("Описание"), "A sufficiently long description here.");
      await uploadPreviewImage(user);
      await screen.findByAltText("");
      await user.click(screen.getByRole("button", { name: "Создать курс" }));

      expect(await screen.findByText("Курс с таким названием уже существует")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  describe("Режим редактирования (course передан)", () => {
    it("должен предзаполнить поля значениями курса и показать кнопку 'Сохранить изменения'", () => {
      render(<CourseForm course={createCourse({ title: "My Course" })} />);

      expect(screen.getByLabelText("Название")).toHaveValue("My Course");
      expect(screen.getByLabelText("Описание")).toHaveValue("Existing description long enough");
      expect(screen.getByText("existing-tag")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Сохранить изменения" })).toBeInTheDocument();
    });

    it("должен вызвать updateCourse(id, payload) с изменённым title", async () => {
      // Given
      updateCourseMock.mockResolvedValue({ message: "ok", course: { _id: "course-1" } });
      const user = userEvent.setup();
      render(<CourseForm course={createCourse()} />);

      // When
      const titleInput = screen.getByLabelText("Название");
      await user.clear(titleInput);
      await user.type(titleInput, "Renamed Course");
      await user.click(screen.getByRole("button", { name: "Сохранить изменения" }));

      // Then
      expect(updateCourseMock).toHaveBeenCalledWith(
        "course-1",
        expect.objectContaining({ title: "Renamed Course", previewImage: "https://example.com/existing.png" })
      );
      expect(createCourseMock).not.toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalledWith("Курс обновлён");
      expect(pushMock).toHaveBeenCalledWith("/courses/course-1");
    });
  });

  describe("Теги", () => {
    it("должен добавлять тег по запятой (не только по Enter)", async () => {
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.type(screen.getByLabelText("Теги"), "react,");

      expect(screen.getByText("react")).toBeInTheDocument();
    });

    it("не должен добавлять дубликат уже существующего тега", async () => {
      const user = userEvent.setup();
      render(<CourseForm />);

      const tagsInput = screen.getByLabelText("Теги");
      await user.type(tagsInput, "react{Enter}");
      await user.type(tagsInput, "react{Enter}");

      expect(screen.getAllByText("react")).toHaveLength(1);
    });

    it("должен убирать тег по клику на крестик", async () => {
      const user = userEvent.setup();
      render(<CourseForm course={createCourse({ tags: ["existing-tag"] })} />);

      await user.click(screen.getByRole("button", { name: "Убрать тег existing-tag" }));

      expect(screen.queryByText("existing-tag")).not.toBeInTheDocument();
    });
  });

  describe("Сложность курса", () => {
    it("должен переключать difficulty через Select и передавать выбранное значение в payload", async () => {
      // Given
      createCourseMock.mockResolvedValue({ message: "ok", course: { _id: "new-course-id" } });
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.type(screen.getByLabelText("Название"), "New Course");
      await user.type(screen.getByLabelText("Описание"), "A sufficiently long description here.");
      await uploadPreviewImage(user);
      await screen.findByAltText("");

      // When
      await user.click(screen.getByRole("combobox", { name: "Сложность" }));
      await user.click(await screen.findByRole("option", { name: "Продвинутый" }));
      await user.click(screen.getByRole("button", { name: "Создать курс" }));

      // Then
      expect(createCourseMock).toHaveBeenCalledWith(expect.objectContaining({ difficulty: "advanced" }));
    });
  });

  describe("Переключатель публикации", () => {
    it("должен переключать isPublished и передавать его в payload при сабмите", async () => {
      // Given
      createCourseMock.mockResolvedValue({ message: "ok", course: { _id: "new-course-id" } });
      const user = userEvent.setup();
      render(<CourseForm />);

      await user.type(screen.getByLabelText("Название"), "New Course");
      await user.type(screen.getByLabelText("Описание"), "A sufficiently long description here.");
      await uploadPreviewImage(user);
      await screen.findByAltText("");

      // When
      await user.click(screen.getByRole("switch"));
      await user.click(screen.getByRole("button", { name: "Создать курс" }));

      // Then
      expect(createCourseMock).toHaveBeenCalledWith(expect.objectContaining({ isPublished: true }));
    });
  });
});
