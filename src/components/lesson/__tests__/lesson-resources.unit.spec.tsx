import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LessonResources } from "../lesson-resources";
import type { LessonResource } from "@/lib/api/types";

describe("LessonResources", () => {
  describe("Когда ресурс — ссылка (type: link)", () => {
    it("должен отрендерить title/description и НЕ показывать иконку Download", () => {
      const resources: LessonResource[] = [{ type: "link", title: "Docs", url: "https://example.com", description: "External docs" }];
      render(<LessonResources resources={resources} />);

      expect(screen.getByText("Docs")).toBeInTheDocument();
      expect(screen.getByText("External docs")).toBeInTheDocument();
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("Когда ресурс — файл (type: file) с известным размером", () => {
    it("должен показать отформатированный размер файла", () => {
      const resources: LessonResource[] = [{ type: "file", title: "Slides", url: "https://s3/slides.pdf", fileSize: 2048 }];
      render(<LessonResources resources={resources} />);

      expect(screen.getByText("2.0 КБ")).toBeInTheDocument();
    });
  });

  describe("Когда fileSize не задан", () => {
    it("не должен показывать строку с размером", () => {
      const resources: LessonResource[] = [{ type: "file", title: "Slides", url: "https://s3/slides.pdf" }];
      render(<LessonResources resources={resources} />);

      expect(screen.queryByText(/КБ|МБ|Б$/)).not.toBeInTheDocument();
    });
  });

  describe("Когда ресурсов несколько", () => {
    it("должен отрендерить их все в переданном порядке", () => {
      const resources: LessonResource[] = [
        { type: "link", title: "First", url: "https://a.com" },
        { type: "file", title: "Second", url: "https://b.com" },
      ];
      render(<LessonResources resources={resources} />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveTextContent("First");
      expect(links[1]).toHaveTextContent("Second");
    });
  });
});
