import { describe, it, expect, vi, beforeEach } from "vitest";
import type { apiClient as ApiClientFn } from "../http-client";

// apiClient замокан — проверяем только то, что courses.client.ts само добавляет к запросу
// (путь, метод, тело), тот же принцип, что и в auth.client.unit.spec.ts.
vi.mock("../http-client", () => ({ apiClient: vi.fn() }));

const { apiClient } = (await import("../http-client")) as unknown as { apiClient: typeof ApiClientFn };
const { rateCourse, uploadCoursePreviewImage, createCourse, updateCourse, deleteCourse } = await import(
  "../courses.client"
);

const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

describe("courses.client", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
    mockApiClient.mockResolvedValue({ message: "ok" });
  });

  describe("rateCourse", () => {
    it("должен отправить POST на /api/courses/:id/ratings с value в теле", async () => {
      await rateCourse("course-1", 4);

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/courses/course-1/ratings",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ value: 4 }) })
      );
    });
  });

  describe("uploadCoursePreviewImage", () => {
    it("должен отправить POST на /api/courses/preview-image с файлом в FormData", async () => {
      const file = new File(["x"], "cover.png", { type: "image/png" });

      await uploadCoursePreviewImage(file);

      const [path, init] = mockApiClient.mock.calls[0] as [string, RequestInit];
      expect(path).toBe("/api/courses/preview-image");
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.body as FormData).get("file")).toBe(file);
    });
  });

  describe("createCourse", () => {
    it("должен отправить POST на /api/courses с телом как есть (без author)", async () => {
      const input = {
        title: "Course",
        description: "Description long enough",
        previewImage: "https://example.com/x.png",
        tags: ["a"],
        difficulty: "beginner" as const,
        isPublished: false,
      };

      await createCourse(input);

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/courses",
        expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
      );
    });
  });

  describe("updateCourse", () => {
    it("должен отправить PATCH на /api/courses/:id со всеми полями разом", async () => {
      const input = {
        title: "Updated",
        description: "Updated description long enough",
        previewImage: "https://example.com/x.png",
        tags: [],
        difficulty: "advanced" as const,
        isPublished: true,
      };

      await updateCourse("course-1", input);

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/courses/course-1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) })
      );
    });
  });

  describe("deleteCourse", () => {
    it("должен отправить DELETE на /api/courses/:id без тела", async () => {
      await deleteCourse("course-1");

      expect(mockApiClient).toHaveBeenCalledWith("/api/courses/course-1", { method: "DELETE" });
    });
  });
});
