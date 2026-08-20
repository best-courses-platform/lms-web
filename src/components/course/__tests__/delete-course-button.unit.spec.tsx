import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

const deleteCourseMock = vi.fn();
vi.mock("@/lib/api/courses.client", () => ({ deleteCourse: deleteCourseMock }));

const { ApiError } = await import("@/lib/api/core");
const { DeleteCourseButton } = await import("../delete-course-button");

describe("DeleteCourseButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastSuccess.mockReset();
    deleteCourseMock.mockReset();
  });

  describe("Когда диалог ещё не открыт", () => {
    it("не должен вызывать deleteCourse — нужно осознанное подтверждение", () => {
      render(<DeleteCourseButton courseId="course-1" />);
      expect(deleteCourseMock).not.toHaveBeenCalled();
    });
  });

  describe("Когда пользователь открывает диалог и подтверждает удаление", () => {
    it("должен вызвать deleteCourse(courseId) и перенаправить на /dashboard", async () => {
      // Given
      deleteCourseMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<DeleteCourseButton courseId="course-1" />);

      // When
      await user.click(screen.getByRole("button", { name: "Удалить курс" }));
      await user.click(await screen.findByRole("button", { name: "Удалить" }));

      // Then
      expect(deleteCourseMock).toHaveBeenCalledWith("course-1");
      expect(toastSuccess).toHaveBeenCalledWith("Курс удалён");
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Когда пользователь открывает диалог и отменяет", () => {
    it("не должен вызывать deleteCourse", async () => {
      const user = userEvent.setup();
      render(<DeleteCourseButton courseId="course-1" />);

      await user.click(screen.getByRole("button", { name: "Удалить курс" }));
      await user.click(await screen.findByRole("button", { name: "Отмена" }));

      expect(deleteCourseMock).not.toHaveBeenCalled();
    });
  });

  describe("Когда deleteCourse() падает с ApiError", () => {
    it("должен показать сообщение ошибки внутри диалога, не редиректить", async () => {
      deleteCourseMock.mockRejectedValue(new ApiError(403, "Только автор курса может выполнять это действие"));
      const user = userEvent.setup();
      render(<DeleteCourseButton courseId="course-1" />);

      await user.click(screen.getByRole("button", { name: "Удалить курс" }));
      await user.click(await screen.findByRole("button", { name: "Удалить" }));

      expect(await screen.findByText("Только автор курса может выполнять это действие")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
