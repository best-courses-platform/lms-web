import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rating, User } from "@/lib/api/types";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const rateCourseMock = vi.fn();
vi.mock("@/lib/api/courses.client", () => ({ rateCourse: rateCourseMock }));

const { ApiError } = await import("@/lib/api/core");
const { RatingWidget } = await import("../rating-widget");

const currentUser: User = { id: "user-1", email: "u@example.com", name: "U", role: "student" };

describe("RatingWidget", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    rateCourseMock.mockReset();
  });

  describe("Когда пользователь не залогинен", () => {
    it("должен показать приглашение войти, не рендерить звёзды", () => {
      render(<RatingWidget courseId="c1" ratings={[]} currentUser={null} />);

      expect(screen.getByText(/Войдите/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Оценить на/ })).not.toBeInTheDocument();
    });
  });

  describe("Когда пользователь уже оценивал курс", () => {
    it("должен показать текущую оценку", () => {
      const ratings: Rating[] = [{ userId: "user-1", value: 4, createdAt: "2026-01-01T00:00:00.000Z" }];
      render(<RatingWidget courseId="c1" ratings={ratings} currentUser={currentUser} />);

      expect(screen.getByText("ваша оценка: 4")).toBeInTheDocument();
    });
  });

  describe("Когда пользователь кликает по звезде", () => {
    it("должен вызвать rateCourse(courseId, value), обновить страницу и показать toast", async () => {
      rateCourseMock.mockResolvedValue({ message: "ok", course: {} });
      const user = userEvent.setup();
      render(<RatingWidget courseId="c1" ratings={[]} currentUser={currentUser} />);

      await user.click(screen.getByRole("button", { name: "Оценить на 3" }));

      expect(rateCourseMock).toHaveBeenCalledWith("c1", 3);
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalledWith("Спасибо за оценку!");
    });
  });

  describe("Когда rateCourse() падает с ApiError", () => {
    it("должен показать error-toast с сообщением из ApiError", async () => {
      rateCourseMock.mockRejectedValue(new ApiError(400, "Оценка должна быть от 1 до 5"));
      const user = userEvent.setup();
      render(<RatingWidget courseId="c1" ratings={[]} currentUser={currentUser} />);

      await user.click(screen.getByRole("button", { name: "Оценить на 5" }));

      expect(toastError).toHaveBeenCalledWith("Оценка должна быть от 1 до 5");
      expect(refreshMock).not.toHaveBeenCalled();
    });
  });
});
