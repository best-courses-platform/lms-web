"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Ловит только по-настоящему непредвиденные ошибки — 403 (нет доступа) и 404 (не найден)
// обработаны прямо в page.tsx (notFound()/явный блок), сюда долетают сбои вида "API упал".
export default function CourseError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Не удалось загрузить курс</h1>
      <p className="text-sm text-muted-foreground">Попробуйте ещё раз через минуту.</p>
      <Button onClick={reset}>Повторить</Button>
    </div>
  );
}
