"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { rateCourse } from "@/lib/api/courses.client";
import { ApiError } from "@/lib/api/core";
import type { Rating, User } from "@/lib/api/types";

export function RatingWidget({
  courseId,
  ratings,
  currentUser,
}: {
  courseId: string;
  ratings: Rating[];
  currentUser: User | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const myRating = currentUser ? ratings.find((r) => r.userId === currentUser.id) : undefined;

  async function handleRate(value: number) {
    setPending(true);
    try {
      await rateCourse(courseId, value);
      // Курс в ответе уже содержит пересчитанный averageRating — но проще заново
      // отрендерить Server Component страницы, чем тащить его состояние в клиент.
      router.refresh();
      toast.success("Спасибо за оценку!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось сохранить оценку");
    } finally {
      setPending(false);
    }
  }

  if (!currentUser) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Войдите
        </Link>
        , чтобы оценить курс.
      </p>
    );
  }

  const activeValue = hovered ?? myRating?.value ?? 0;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={pending}
          onMouseEnter={() => setHovered(value)}
          onClick={() => handleRate(value)}
          aria-label={`Оценить на ${value}`}
          className="disabled:opacity-50"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              value <= activeValue ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
      {myRating && <span className="ml-2 text-sm text-muted-foreground">ваша оценка: {myRating.value}</span>}
    </div>
  );
}
