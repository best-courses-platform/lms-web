import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { CreateCourseForm } from "@/components/course/create-course-form";
import { getCurrentUser } from "@/lib/api/auth.server";

export const metadata: Metadata = { title: "Новый курс — Best Courses" };

// Симметрично бэкенду: POST /api/courses разрешён только author/admin
// (requireRole(['author', 'admin']), см. course.routes.ts в express-lms).
const CAN_CREATE_COURSE_ROLES = new Set(["author", "admin"]);

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!CAN_CREATE_COURSE_ROLES.has(user.role)) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Недоступно</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Создавать курсы могут только авторы. Обратитесь к администратору, если вам нужен этот доступ.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Новый курс</h1>
      <CreateCourseForm />
    </div>
  );
}
