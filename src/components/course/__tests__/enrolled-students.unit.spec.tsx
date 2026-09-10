import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Enrollment } from "@/lib/api/types";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const enrollStudentMock = vi.fn();
const unenrollStudentMock = vi.fn();
vi.mock("@/lib/api/enrollments.client", () => ({
  enrollStudent: enrollStudentMock,
  unenrollStudent: unenrollStudentMock,
}));

const { ApiError } = await import("@/lib/api/core");
const { EnrolledStudents } = await import("../enrolled-students");

const student: Enrollment = {
  _id: "enrollment-1",
  courseId: "course-1",
  userId: { _id: "user-1", name: "Alice", email: "alice@example.com" },
  status: "active",
  enrolledAt: "2026-09-10T10:00:00.000Z",
};

describe("EnrolledStudents", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
    enrollStudentMock.mockReset();
    unenrollStudentMock.mockReset();
  });

  describe("Рендер списка", () => {
    it("должен показать студента и правильное русское склонение счётчика", () => {
      render(<EnrolledStudents courseId="course-1" initialStudents={[student]} />);

      expect(screen.getByText("Alice (alice@example.com)")).toBeInTheDocument();
      expect(screen.getByText("1 студент")).toBeInTheDocument();
    });

    it("не должен показывать список карточек, когда студентов нет", () => {
      render(<EnrolledStudents courseId="course-1" initialStudents={[]} />);

      expect(screen.getByText("0 студентов")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Отчислить/ })).not.toBeInTheDocument();
    });
  });

  describe("Запись студента по email", () => {
    it("должен вызвать enrollStudent и добавить студента в список при успехе", async () => {
      const newEnrollment: Enrollment = {
        _id: "enrollment-2",
        courseId: "course-1",
        userId: { _id: "user-2", name: "Bob", email: "bob@example.com" },
        status: "active",
        enrolledAt: "2026-09-10T11:00:00.000Z",
      };
      enrollStudentMock.mockResolvedValue({ message: "ok", enrollment: newEnrollment });
      const user = userEvent.setup();
      render(<EnrolledStudents courseId="course-1" initialStudents={[]} />);

      await user.type(screen.getByPlaceholderText("email студента"), "bob@example.com");
      await user.click(screen.getByRole("button", { name: "Записать" }));

      expect(enrollStudentMock).toHaveBeenCalledWith("course-1", "bob@example.com");
      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Студент записан на курс"));
      expect(screen.getByText("Bob (bob@example.com)")).toBeInTheDocument();
      // Поле формы должно очиститься после успешной отправки.
      expect(screen.getByPlaceholderText("email студента")).toHaveValue("");
    });

    it("должен показать error-toast и оставить email в поле при ошибке (например, 404 — нет такого пользователя)", async () => {
      enrollStudentMock.mockRejectedValue(new ApiError(404, "Пользователь с таким email не найден"));
      const user = userEvent.setup();
      render(<EnrolledStudents courseId="course-1" initialStudents={[]} />);

      await user.type(screen.getByPlaceholderText("email студента"), "nobody@example.com");
      await user.click(screen.getByRole("button", { name: "Записать" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith("Пользователь с таким email не найден"));
      expect(screen.getByText("0 студентов")).toBeInTheDocument();
    });
  });

  describe("Отчисление студента", () => {
    it("должен вызвать unenrollStudent(courseId, userId) и убрать студента из списка при успехе", async () => {
      unenrollStudentMock.mockResolvedValue({ message: "ok" });
      const user = userEvent.setup();
      render(<EnrolledStudents courseId="course-1" initialStudents={[student]} />);

      await user.click(screen.getByRole("button", { name: "Отчислить" }));

      expect(unenrollStudentMock).toHaveBeenCalledWith("course-1", "user-1");
      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Студент отчислен"));
      expect(screen.queryByText("Alice (alice@example.com)")).not.toBeInTheDocument();
      expect(screen.getByText("0 студентов")).toBeInTheDocument();
    });

    it("должен показать error-toast и оставить студента в списке при ошибке", async () => {
      unenrollStudentMock.mockRejectedValue(new ApiError(404, "Пользователь не записан на этот курс"));
      const user = userEvent.setup();
      render(<EnrolledStudents courseId="course-1" initialStudents={[student]} />);

      await user.click(screen.getByRole("button", { name: "Отчислить" }));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith("Пользователь не записан на этот курс"));
      expect(screen.getByText("Alice (alice@example.com)")).toBeInTheDocument();
    });
  });
});
