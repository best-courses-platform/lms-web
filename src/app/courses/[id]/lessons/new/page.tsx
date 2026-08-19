import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { CreateLessonForm } from "@/components/lesson/create-lesson-form";
import { getCurrentUser } from "@/lib/api/auth.server";
import { getCourseById } from "@/lib/api/courses.server";
import { ApiError } from "@/lib/api/core";
import { getCourseAuthorId } from "@/lib/api/types";

export const metadata: Metadata = { title: "Новый урок — Best Courses" };

export default async function NewLessonPage(props: PageProps<"/courses/[id]/lessons/new">) {
  const { id } = await props.params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let course;
  try {
    course = await getCourseById(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiError && error.status === 403) {
      course = null;
    } else {
      throw error;
    }
  }

  // Симметрично бэкенду: createLessonForCourse проверяет course.author.equals(userId)
  // (см. lesson.controller.ts в express-lms) — добавлять уроки может только автор
  // именно этого курса, не просто любой пользователь с ролью author.
  if (!course || getCourseAuthorId(course.author) !== user.id) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Недоступно</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Добавлять уроки может только автор курса.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Новый урок</h1>
      <p className="mb-8 text-muted-foreground">{course.title}</p>
      <CreateLessonForm courseId={course._id} />
    </div>
  );
}
