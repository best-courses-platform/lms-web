import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

const createLessonMock = vi.fn();
vi.mock("@/lib/api/lessons.client", () => ({ createLesson: createLessonMock }));

const { ApiError } = await import("@/lib/api/core");
const { CreateLessonForm } = await import("../create-lesson-form");

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Название"), "Lesson title");
  await user.type(screen.getByLabelText("Описание"), "A sufficiently long lesson description.");
}

describe("CreateLessonForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastSuccess.mockReset();
    createLessonMock.mockReset();
  });

  describe("Тег-инпут", () => {
    it("должен добавлять тег по Enter и удалять по клику на крестик", async () => {
      const user = userEvent.setup();
      render(<CreateLessonForm courseId="course-1" />);

      const tagInput = screen.getByLabelText("Теги");
      await user.type(tagInput, "video{Enter}");

      expect(screen.getByText("video")).toBeInTheDocument();
      expect(tagInput).toHaveValue("");

      await user.click(screen.getByRole("button", { name: "Убрать тег video" }));
      expect(screen.queryByText("video")).not.toBeInTheDocument();
    });

    it("не должен добавлять дубликат уже существующего тега", async () => {
      const user = userEvent.setup();
      render(<CreateLessonForm courseId="course-1" />);

      const tagInput = screen.getByLabelText("Теги");
      await user.type(tagInput, "video{Enter}");
      await user.type(tagInput, "video{Enter}");

      expect(screen.getAllByText("video")).toHaveLength(1);
    });
  });

  describe("Когда создание урока прошло успешно", () => {
    it("должен вызвать createLesson(courseId, {title, description, tags}) и перейти на /lessons/:id", async () => {
      // Given
      createLessonMock.mockResolvedValue({
        success: true,
        message: "ok",
        data: { _id: "lesson-42" },
      });
      const user = userEvent.setup();
      render(<CreateLessonForm courseId="course-1" />);

      // When
      await fillRequiredFields(user);
      await user.type(screen.getByLabelText("Теги"), "video{Enter}");
      await user.click(screen.getByRole("button", { name: "Создать урок" }));

      // Then
      expect(createLessonMock).toHaveBeenCalledWith("course-1", {
        title: "Lesson title",
        description: "A sufficiently long lesson description.",
        tags: ["video"],
      });
      expect(toastSuccess).toHaveBeenCalledWith("Урок создан");
      expect(pushMock).toHaveBeenCalledWith("/lessons/lesson-42");
    });
  });

  describe("Когда createLesson() падает с ApiError", () => {
    it("должен показать сообщение ошибки и не переходить на страницу урока", async () => {
      createLessonMock.mockRejectedValue(new ApiError(403, "Только автор курса может выполнять это действие"));
      const user = userEvent.setup();
      render(<CreateLessonForm courseId="course-1" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: "Создать урок" }));

      expect(await screen.findByText("Только автор курса может выполнять это действие")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
