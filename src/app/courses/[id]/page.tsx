import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Lock, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/course/difficulty-badge";
import { RatingWidget } from "@/components/course/rating-widget";
import { getCourseById, getCourseRatings } from "@/lib/api/courses.server";
import { getLessonsByCourse } from "@/lib/api/lessons.server";
import { getCurrentUser } from "@/lib/api/auth.server";
import { ApiError } from "@/lib/api/core";
import { getCourseAuthorId } from "@/lib/api/types";

async function loadCourse(id: string) {
  try {
    const course = await getCourseById(id);
    const [lessons, ratings] = await Promise.all([getLessonsByCourse(id), getCourseRatings(id)]);
    return { course, lessons, ratings, forbidden: false as const };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiError && error.status === 403) {
      return { forbidden: true as const };
    }
    throw error;
  }
}

export async function generateMetadata(props: PageProps<"/courses/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const course = await getCourseById(id);
    return { title: `${course.title} — Best Courses` };
  } catch {
    return { title: "Курс — Best Courses" };
  }
}

export default async function CoursePage(props: PageProps<"/courses/[id]">) {
  const { id } = await props.params;
  const [data, currentUser] = await Promise.all([loadCourse(id), getCurrentUser()]);

  if (data.forbidden) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Курс недоступен</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Этот курс не опубликован, и у вас нет доступа к нему. Обратитесь к автору курса.
        </p>
      </div>
    );
  }

  const { course, lessons, ratings } = data;
  const isCourseAuthor = currentUser != null && currentUser.id === getCourseAuthorId(course.author);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.previewImage} alt="" className="size-full object-cover" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={course.difficulty} />
        {course.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
        {isCourseAuthor && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/courses/${course._id}/edit`}>
              <Pencil />
              Редактировать
            </Link>
          </Button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-muted-foreground">{course.description}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Оценка курса</h2>
        <RatingWidget courseId={course._id} ratings={ratings} currentUser={currentUser} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Программа курса</h2>
          {isCourseAuthor && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/courses/${course._id}/lessons/new`}>
                <Plus />
                Добавить урок
              </Link>
            </Button>
          )}
        </div>
        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">В курсе пока нет уроков.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {lessons
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <li key={lesson._id}>
                  <Link
                    href={`/lessons/${lesson._id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent"
                  >
                    <span className="text-sm tabular-nums text-muted-foreground">{lesson.order}</span>
                    <span className="flex-1 font-medium">{lesson.title}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
          </ol>
        )}
      </section>
    </div>
  );
}
