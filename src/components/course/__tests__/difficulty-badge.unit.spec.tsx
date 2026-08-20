import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DifficultyBadge } from "../difficulty-badge";

describe("DifficultyBadge", () => {
  describe.each([
    ["beginner", "Начальный"],
    ["intermediate", "Средний"],
    ["advanced", "Продвинутый"],
  ] as const)("Когда difficulty=%s", (difficulty, label) => {
    it(`должен отрендерить текст "${label}"`, () => {
      render(<DifficultyBadge difficulty={difficulty} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
