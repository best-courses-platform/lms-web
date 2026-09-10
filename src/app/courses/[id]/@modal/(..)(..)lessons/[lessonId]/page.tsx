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

// (..)(..)lessons/[lessonId] — перехватывает переход на /lessons/[id], сделанный кликом по
// <Link> ИЗНУТРИ поддерева /courses/[id] (сейчас единственный источник такого клика —
// сама страница курса) — рендерится в @modal-слоте, объявленном в courses/[id]/layout.tsx,
// поверх текущей страницы, не заменяя её. Прямой переход по URL/обновление страницы/
// открытие в новой вкладке, а также клик по <Link> ОТКУДА-ТО ЕЩЁ (не из-под /courses/[id] —
// например, кнопки "предыдущий/следующий урок" на самой полной странице урока) не
// перехватываются вообще: это либо не client-side навигация, либо @modal-слот в этот
// момент просто не смонтирован (см. courses/[id]/layout.tsx) — в обоих случаях срабатывает
// обычный src/app/lessons/[id]/page.tsx (полная страница, см. также ссылку "Открыть
// полностью" ниже).
//
// Параметр назван [lessonId], не [id] — Next.js не разрешает повторить одно и то же имя
// динамического сегмента дважды в одной цепочке маршрута ("You cannot have the same slug
// name..."), а курсовый [id] (из courses/[id]/) и урочный уже присутствуют в одной цепочке,
// раз этот перехватчик физически лежит внутри courses/[id]/@modal/. Имя сегмента — вопрос
// локального именования файла/папки, не меняет, какой реальный URL перехватывается.
//
// (..)(..) — ДВА уровня выше папки, где физически лежит сам @modal, не один. Счёт идёт
// от папки, непосредственно СОДЕРЖАЩЕЙ @modal (courses/[id]/), а не от корня — и она сама
// уже вложена на 2 уровня (courses → [id]), поэтому нужно сократить оба уровня, чтобы
// попасть в /lessons/[id] (прямой потомок app/, то есть глубина 1). Одиночный (..) вместо
// этого целился бы в несуществующий /courses/lessons/[id] — из-за чего первая версия этого
// перехватчика (тем же (..), но при другой физической глубине) не срабатывала: клик по
// уроку со страницы курса не открывал модалку вообще, URL просто уходил на полную
// страницу — проверено вживую (e2e), не только предположение. Живой пример из
// документации Next.js (app/feed/@modal/(..)photo) использует (..) корректно именно
// потому, что там @modal лежит на ОДНОМ уровне вложенности (только feed/), не на двух.
// Не notFound()/redirect() внутри этого файла: они повлияли бы на всю страницу целиком,
// а не только на модалку — 403/404 показываем инлайн.
export default async function LessonPreviewInterceptedPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId: id } = await params;
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
