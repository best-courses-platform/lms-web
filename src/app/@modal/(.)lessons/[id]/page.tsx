import { Lock } from "lucide-react";
import { LessonPreviewModal } from "@/components/lesson/lesson-preview-modal";
import { LessonResources } from "@/components/lesson/lesson-resources";
import { getLessonById } from "@/lib/api/lessons.server";
import { ApiError } from "@/lib/api/core";
import type { Lesson } from "@/lib/api/types";

// Тот же приём, что и loadCourse/loadLesson в page.tsx полных страниц — данные и их
// (не)успешное получение живут в отдельной функции, JSX строится уже после, вне try/catch
// (react-hooks/error-boundaries: JSX внутри try/catch не даёт того, что кажется — React не
// рендерит компонент немедленно, ошибка внутри него try/catch снаружи не поймает).
async function loadLessonPreview(id: string): Promise<{ lesson: Lesson; deniedStatus: null } | { lesson: null; deniedStatus: 403 | 404 }> {
  try {
    const lesson = await getLessonById(id);
    return { lesson, deniedStatus: null };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return { lesson: null, deniedStatus: error.status };
    }
    throw error;
  }
}

// (.)lessons/[id] — перехватывает переход на /lessons/[id], сделанный кликом по <Link>
// ИЗНУТРИ приложения (например, со страницы курса) — рендерится в @modal-слоте поверх
// текущей страницы, не заменяя её. Прямой переход по URL/обновление страницы/открытие
// в новой вкладке — Next не через что перехватывать (это не client-side навигация внутри
// уже загруженного приложения), поэтому там срабатывает обычный src/app/lessons/[id]/page.tsx
// (полная страница, см. также ссылку "Открыть полностью" ниже).
//
// (.) — сегмент на том же уровне дерева, что и сам @modal (оба — прямые потомки app/),
// то же самое, что и у /lessons/[id]. Не notFound()/redirect() внутри этого файла: они
// повлияли бы на всю страницу целиком, а не только на модалку — 403/404 показываем инлайн.
export default async function LessonPreviewInterceptedPage(props: PageProps<"/lessons/[id]">) {
  const { id } = await props.params;
  const { lesson, deniedStatus } = await loadLessonPreview(id);

  if (deniedStatus) {
    return (
      <LessonPreviewModal title="Урок недоступен">
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <Lock className="size-6" />
          {deniedStatus === 404 ? "Урок не найден." : "У вас нет доступа к этому уроку."}
        </div>
      </LessonPreviewModal>
    );
  }

  return (
    <LessonPreviewModal title={lesson.title}>
      {lesson.videoFile?.url && (
        <video controls className="aspect-video w-full rounded-lg bg-muted" src={lesson.videoFile.url} />
      )}
      <p className="line-clamp-6 whitespace-pre-line text-sm text-muted-foreground">{lesson.description}</p>
      {lesson.resources && lesson.resources.length > 0 && <LessonResources resources={lesson.resources} />}
      {/* Обычный <a>, не next/link — клиентская навигация на уже активный URL /lessons/[id]
          не переключит рендер с перехваченной модалки на полную страницу; нужен настоящий
          переход (обновление документа), которого не видит перехватчик интерфейса. */}
      <a href={`/lessons/${id}`} className="text-sm text-foreground underline underline-offset-4">
        Открыть полностью
      </a>
    </LessonPreviewModal>
  );
}
