import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Lesson } from "@/lib/api/types";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const uploadLessonFileMock = vi.fn();
const deleteLessonFileMock = vi.fn();
const deleteLessonResourceMock = vi.fn();
vi.mock("@/lib/api/lessons.client", () => ({
  uploadLessonFile: uploadLessonFileMock,
  deleteLessonFile: deleteLessonFileMock,
  deleteLessonResource: deleteLessonResourceMock,
}));

const { ApiError } = await import("@/lib/api/core");
const { LessonMediaManager } = await import("../lesson-media-manager");

function createLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    _id: "lesson-1",
    title: "Lesson",
    description: "Description",
    courseId: "course-1",
    order: 0,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LessonMediaManager", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    uploadLessonFileMock.mockReset();
    deleteLessonFileMock.mockReset();
    deleteLessonResourceMock.mockReset();
  });

  describe("Видео — загрузка", () => {
    it("должен вызвать uploadLessonFile(lessonId, file, 'video'), показать toast и обновить страницу", async () => {
      // Given
      uploadLessonFileMock.mockResolvedValue({ success: true, message: "ok", data: {}, fileUrl: "x" });
      const user = userEvent.setup();
      render(<LessonMediaManager lesson={createLesson()} />);
      const file = new File(["x"], "clip.mp4", { type: "video/mp4" });

      // When
      await user.upload(screen.getByLabelText("Видео"), file);

      // Then
      expect(uploadLessonFileMock).toHaveBeenCalledWith("lesson-1", file, "video");
      expect(toastSuccess).toHaveBeenCalledWith("Видео загружено");
      expect(refreshMock).toHaveBeenCalled();
    });

    it("должен показать error-toast, если загрузка упала с ApiError", async () => {
      uploadLessonFileMock.mockRejectedValue(new ApiError(400, "Неверный тип файла"));
      const user = userEvent.setup();
      render(<LessonMediaManager lesson={createLesson()} />);

      await user.upload(screen.getByLabelText("Видео"), new File(["x"], "clip.mp4", { type: "video/mp4" }));

      expect(toastError).toHaveBeenCalledWith("Неверный тип файла");
    });
  });

  describe("Видео — уже загружено", () => {
    it("должен показать имя файла и кнопку удаления", () => {
      render(
        <LessonMediaManager
          lesson={createLesson({ videoFile: { url: "https://s3/clip.mp4", originalName: "clip.mp4" } })}
        />
      );

      expect(screen.getByText("clip.mp4")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Удалить видео" })).toBeInTheDocument();
    });

    it("клик по удалению должен вызвать deleteLessonFile с url видео и типом 'video'", async () => {
      deleteLessonFileMock.mockResolvedValue({ success: true, message: "ok", data: {} });
      const user = userEvent.setup();
      render(
        <LessonMediaManager
          lesson={createLesson({ videoFile: { url: "https://s3/clip.mp4", originalName: "clip.mp4" } })}
        />
      );

      await user.click(screen.getByRole("button", { name: "Удалить видео" }));

      expect(deleteLessonFileMock).toHaveBeenCalledWith("lesson-1", "https://s3/clip.mp4", "video");
      expect(toastSuccess).toHaveBeenCalledWith("Видео удалено");
    });

    it("должен показать error-toast, если удаление видео упало с ApiError", async () => {
      deleteLessonFileMock.mockRejectedValue(new ApiError(403, "Только автор курса может выполнять это действие"));
      const user = userEvent.setup();
      render(
        <LessonMediaManager
          lesson={createLesson({ videoFile: { url: "https://s3/clip.mp4", originalName: "clip.mp4" } })}
        />
      );

      await user.click(screen.getByRole("button", { name: "Удалить видео" }));

      expect(toastError).toHaveBeenCalledWith("Только автор курса может выполнять это действие");
    });
  });

  describe("Видео — не загружено", () => {
    it("не должен показывать кнопку удаления видео", () => {
      render(<LessonMediaManager lesson={createLesson()} />);
      expect(screen.queryByRole("button", { name: "Удалить видео" })).not.toBeInTheDocument();
    });
  });

  describe("Материалы — загрузка с заголовком", () => {
    it("должен передать введённый title в uploadLessonFile и очистить поле после успеха", async () => {
      uploadLessonFileMock.mockResolvedValue({ success: true, message: "ok", data: {}, fileUrl: "x" });
      const user = userEvent.setup();
      render(<LessonMediaManager lesson={createLesson()} />);

      await user.type(screen.getByPlaceholderText("Название материала (необязательно)"), "Notes");
      // Label "Материалы" не связан с #resource через htmlFor в разметке — getByLabelText
      // здесь недоступен, ищем input напрямую по id.
      const resourceInput = document.getElementById("resource") as HTMLInputElement;
      await user.upload(resourceInput, new File(["x"], "notes.pdf", { type: "application/pdf" }));

      expect(uploadLessonFileMock).toHaveBeenCalledWith("lesson-1", expect.any(File), "resource", { title: "Notes" });
      expect(screen.getByPlaceholderText("Название материала (необязательно)")).toHaveValue("");
    });

    it("должен показать error-toast, если загрузка материала упала с ApiError", async () => {
      uploadLessonFileMock.mockRejectedValue(new ApiError(400, "Неверный тип файла"));
      const user = userEvent.setup();
      render(<LessonMediaManager lesson={createLesson()} />);

      const resourceInput = document.getElementById("resource") as HTMLInputElement;
      await user.upload(resourceInput, new File(["x"], "notes.pdf", { type: "application/pdf" }));

      expect(toastError).toHaveBeenCalledWith("Неверный тип файла");
    });
  });

  describe("Материалы — список и удаление", () => {
    it("должен отрендерить существующие ресурсы и удалить по клику на конкретный", async () => {
      deleteLessonResourceMock.mockResolvedValue({ success: true, message: "ok", data: {} });
      const user = userEvent.setup();
      render(
        <LessonMediaManager
          lesson={createLesson({
            resources: [
              { type: "file", title: "First", fileSize: 1024 },
              { type: "link", title: "Second", url: "https://example.com" },
            ],
          })}
        />
      );

      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Удалить материал Second" }));

      expect(deleteLessonResourceMock).toHaveBeenCalledWith("lesson-1", 1);
      expect(toastSuccess).toHaveBeenCalledWith("Материал удалён");
    });

    it("должен показать error-toast, если удаление материала упало с ApiError", async () => {
      deleteLessonResourceMock.mockRejectedValue(new ApiError(404, "Ресурс не найден"));
      const user = userEvent.setup();
      render(
        <LessonMediaManager lesson={createLesson({ resources: [{ type: "file", title: "First" }] })} />
      );

      await user.click(screen.getByRole("button", { name: "Удалить материал First" }));

      expect(toastError).toHaveBeenCalledWith("Ресурс не найден");
    });
  });
});
