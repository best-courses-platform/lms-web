"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Обёртка над Dialog для перехваченных (intercepting) роутов — закрытие модалки (Escape,
// клик по оверлею, крестик) должно вернуть на страницу курса, с которой был переход, а не
// просто убрать оверлей: без router.back() URL остался бы на /lessons/[id] после закрытия,
// хотя визуально модалка исчезла — рассинхронизация URL и того, что реально видно на экране.
export function LessonPreviewModal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
