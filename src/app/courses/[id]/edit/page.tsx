import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { CourseForm } from "@/components/course/course-form";
import { DeleteCourseButton } from "@/components/course/delete-course-button";
import { getCurrentUser } from "@/lib/api/auth.server";
import { getCourseById } from "@/lib/api/courses.server";
import { ApiError } from "@/lib/api/core";
import { getCourseAuthorId } from "@/lib/api/types";

export const metadata: Metadata = { title: "Редактирование курса — Best Courses" };

export default async function EditCoursePage(props: PageProps<"/courses/[id]/edit">) {
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

  // Симметрично бэкенду: courseService.update проверяет course.author.equals(userId) —
  // редактировать курс может только его автор, не просто пользователь с ролью author.
  if (!course || getCourseAuthorId(course.author) !== user.id) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Недоступно</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Редактировать курс может только его автор.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Редактирование курса</h1>
      <CourseForm course={course} />

      <section className="mt-10 rounded-2xl border border-destructive/30 p-5">
        <h2 className="text-sm font-medium text-destructive">Опасная зона</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Удаление курса необратимо и заберёт с собой все его уроки.
        </p>
        <DeleteCourseButton courseId={course._id} />
      </section>
    </div>
  );
}
