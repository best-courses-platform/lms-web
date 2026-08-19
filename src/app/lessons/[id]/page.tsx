import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonResources } from "@/components/lesson/lesson-resources";
import { LessonMediaManager } from "@/components/lesson/lesson-media-manager";
import { getLessonById, getLessonsByCourse } from "@/lib/api/lessons.server";
import { getCourseById } from "@/lib/api/courses.server";
import { getCurrentUser } from "@/lib/api/auth.server";
import { ApiError } from "@/lib/api/core";
import { getCourseAuthorId } from "@/lib/api/types";

async function loadLesson(id: string) {
  try {
    const lesson = await getLessonById(id);
    // getLessonById уже проверил доступ на бэкенде (через родительский курс) — здесь эти
    // два запроса безопасны, тот же пользователь по определению видит и то, и другое.
    const [course, courseLessons] = await Promise.all([
      getCourseById(lesson.courseId),
      getLessonsByCourse(lesson.courseId),
    ]);
    return { lesson, course, courseLessons, forbidden: false as const };
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

export async function generateMetadata(props: PageProps<"/lessons/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const lesson = await getLessonById(id);
    return { title: `${lesson.title} — Best Courses` };
  } catch {
    return { title: "Урок — Best Courses" };
  }
}

export default async function LessonPage(props: PageProps<"/lessons/[id]">) {
  const { id } = await props.params;
  const [data, currentUser] = await Promise.all([loadLesson(id), getCurrentUser()]);

  if (data.forbidden) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Урок недоступен</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          У вас нет доступа к курсу, которому принадлежит этот урок.
        </p>
      </div>
    );
  }

  const { lesson, course, courseLessons } = data;
  const isCourseAuthor = currentUser != null && currentUser.id === getCourseAuthorId(course.author);

  const sortedLessons = courseLessons.slice().sort((a, b) => a.order - b.order);
  const currentIndex = sortedLessons.findIndex((l) => l._id === lesson._id);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href={`/courses/${course._id}`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {course.title}
      </Link>

      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{lesson.title}</h1>

      {lesson.videoFile?.url && (
        <video controls className="mb-8 aspect-video w-full rounded-2xl bg-muted" src={lesson.videoFile.url} />
      )}

      <p className="whitespace-pre-line text-muted-foreground">{lesson.description}</p>

      {(lesson.inputExamples || lesson.outputExamples) && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {lesson.inputExamples && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Пример входных данных</h2>
              <pre className="whitespace-pre-wrap text-sm">{lesson.inputExamples}</pre>
            </div>
          )}
          {lesson.outputExamples && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Пример результата</h2>
              <pre className="whitespace-pre-wrap text-sm">{lesson.outputExamples}</pre>
            </div>
          )}
        </section>
      )}

      {lesson.resources && lesson.resources.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Материалы</h2>
          <LessonResources resources={lesson.resources} />
        </section>
      )}

      {isCourseAuthor && <LessonMediaManager lesson={lesson} />}

      <nav className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
        {prevLesson ? (
          <Button variant="outline" asChild>
            <Link href={`/lessons/${prevLesson._id}`}>
              <ChevronLeft className="size-4" />
              {prevLesson.title}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {nextLesson && (
          <Button variant="outline" asChild>
            <Link href={`/lessons/${nextLesson._id}`}>
              {nextLesson.title}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
