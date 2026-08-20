import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  describe("Когда переданы условные классы", () => {
    it("должен отбросить falsy-значения и объединить остальные", () => {
      expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
    });
  });

  describe("Когда классы конфликтуют по Tailwind-группе", () => {
    it("должен оставить последний (twMerge), а не оба", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });
  });
});
