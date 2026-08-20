import { describe, it, expect, vi, beforeEach } from "vitest";
import type { apiClient as ApiClientFn } from "../http-client";

vi.mock("../http-client", () => ({ apiClient: vi.fn() }));

const { apiClient } = (await import("../http-client")) as unknown as { apiClient: typeof ApiClientFn };
const { createLesson, uploadLessonFile, deleteLessonFile, deleteLessonResource } = await import("../lessons.client");

const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

describe("lessons.client", () => {
  beforeEach(() => {
    mockApiClient.mockReset();
    mockApiClient.mockResolvedValue({ success: true, message: "ok" });
  });

  describe("createLesson", () => {
    it("должен отправить POST на /api/lessons/course/:courseId с телом без order", async () => {
      await createLesson("course-1", { title: "Lesson", description: "Long enough description", tags: ["a"] });

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/lessons/course/course-1",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "Lesson", description: "Long enough description", tags: ["a"] }),
        })
      );
    });
  });

  describe("uploadLessonFile", () => {
    describe("Когда fileType — video", () => {
      it("должен отправить POST на /api/lessons/:id/files/video с файлом и fileType в FormData", async () => {
        const file = new File(["x"], "clip.mp4", { type: "video/mp4" });

        await uploadLessonFile("lesson-1", file, "video");

        const [path, init] = mockApiClient.mock.calls[0] as [string, RequestInit];
        expect(path).toBe("/api/lessons/lesson-1/files/video");
        const body = init.body as FormData;
        expect(body.get("file")).toBe(file);
        expect(body.get("fileType")).toBe("video");
        expect(body.get("title")).toBeNull();
      });
    });

    describe("Когда fileType — resource, с title и description", () => {
      it("должен отправить POST на /api/lessons/:id/files/resource со всеми полями в FormData", async () => {
        const file = new File(["x"], "notes.pdf", { type: "application/pdf" });

        await uploadLessonFile("lesson-1", file, "resource", { title: "Notes", description: "Some notes" });

        const [path, init] = mockApiClient.mock.calls[0] as [string, RequestInit];
        expect(path).toBe("/api/lessons/lesson-1/files/resource");
        const body = init.body as FormData;
        expect(body.get("title")).toBe("Notes");
        expect(body.get("description")).toBe("Some notes");
      });

      it("не должен добавлять title/description в FormData, если они не переданы", async () => {
        const file = new File(["x"], "notes.pdf", { type: "application/pdf" });

        await uploadLessonFile("lesson-1", file, "resource");

        const [, init] = mockApiClient.mock.calls[0] as [string, RequestInit];
        const body = init.body as FormData;
        expect(body.get("title")).toBeNull();
        expect(body.get("description")).toBeNull();
      });
    });
  });

  describe("deleteLessonFile", () => {
    it("должен отправить DELETE на /api/lessons/:id/files с fileUrl/fileType в теле", async () => {
      await deleteLessonFile("lesson-1", "https://s3/video.mp4", "video");

      expect(mockApiClient).toHaveBeenCalledWith(
        "/api/lessons/lesson-1/files",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ fileUrl: "https://s3/video.mp4", fileType: "video" }),
        })
      );
    });
  });

  describe("deleteLessonResource", () => {
    it("должен отправить DELETE на /api/lessons/:id/resources/:index без тела", async () => {
      await deleteLessonResource("lesson-1", 2);

      expect(mockApiClient).toHaveBeenCalledWith("/api/lessons/lesson-1/resources/2", { method: "DELETE" });
    });
  });
});
