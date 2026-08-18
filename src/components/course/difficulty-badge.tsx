import { Badge } from "@/components/ui/badge";
import type { Difficulty } from "@/lib/api/types";

const LABELS: Record<Difficulty, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
};

// Цвет — по возрастанию сложности, а не просто разные оттенки без смысла:
// зелёный (просто) -> янтарный (средне) -> розовый (сложно).
const STYLES: Record<Difficulty, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  advanced: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant="outline" className={STYLES[difficulty]}>
      {LABELS[difficulty]}
    </Badge>
  );
}
