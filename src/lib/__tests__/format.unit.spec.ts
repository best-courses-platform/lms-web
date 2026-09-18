import { describe, it, expect } from "vitest";
import { formatFileSize, maskEmail } from "../format";

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

describe("maskEmail", () => {
  it("должен оставить 3 первых символа имени и домен целиком", () => {
    expect(maskEmail("maxim@mail.ru")).toBe("max***@mail.ru");
    expect(maskEmail("maxim.volk1994@gmail.com")).toBe("max***@gmail.com");
  });

  it.each([
    ["ab", "a***@example.com"],
    ["abc", "a***@example.com"],
    ["abcd", "ab***@example.com"],
    ["abcde", "abc***@example.com"],
  ])("у короткого имени %s должен скрыть минимум 2 символа", (local, expected) => {
    expect(maskEmail(`${local}@example.com`)).toBe(expected);
  });

  it("должен скрыть имя целиком, если оно состоит из одного символа", () => {
    expect(maskEmail("a@example.com")).toBe("***@example.com");
  });

  it("должен вернуть строку как есть, если это не похоже на email", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});
