"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LessonError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Не удалось загрузить урок</h1>
      <p className="text-sm text-muted-foreground">Попробуйте ещё раз через минуту.</p>
      <Button onClick={reset}>Повторить</Button>
    </div>
  );
}
