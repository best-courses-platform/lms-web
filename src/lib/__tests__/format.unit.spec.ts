import { describe, it, expect } from "vitest";
import { formatFileSize } from "../format";

describe("formatFileSize", () => {
  describe("Когда bytes не передан (undefined)", () => {
    it("должен вернуть null", () => {
      expect(formatFileSize(undefined)).toBeNull();
    });
  });

  describe("Когда bytes меньше 1024", () => {
    it("должен вернуть значение в байтах", () => {
      expect(formatFileSize(512)).toBe("512 Б");
    });

    it("должен вернуть 0 Б для нулевого размера", () => {
      expect(formatFileSize(0)).toBe("0 Б");
    });
  });

  describe("Когда bytes в диапазоне килобайт", () => {
    it("должен вернуть значение в КБ с одним знаком после запятой", () => {
      expect(formatFileSize(1536)).toBe("1.5 КБ");
    });
  });

  describe("Когда bytes в диапазоне мегабайт", () => {
    it("должен вернуть значение в МБ с одним знаком после запятой", () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 МБ");
    });
  });
});
