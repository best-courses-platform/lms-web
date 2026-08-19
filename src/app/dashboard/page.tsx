import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course/course-card";
import { getCurrentUser } from "@/lib/api/auth.server";
import { getMyCourses } from "@/lib/api/courses.server";

export const metadata: Metadata = { title: "Личный кабинет — Best Courses" };

const IS_AUTHOR_ROLE = new Set(["author", "admin"]);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const courses = await getMyCourses();
  const isAuthor = IS_AUTHOR_ROLE.has(user.role);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Личный кабинет</h1>
          <p className="mt-1 text-muted-foreground">
            {isAuthor ? "Курсы, которые вы ведёте" : "Курсы, к которым у вас есть доступ"}
          </p>
        </div>
        {isAuthor && (
          <Button asChild>
            <Link href="/courses/new">
              <Plus />
              Создать курс
            </Link>
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {isAuthor
            ? "Вы пока не создали ни одного курса."
            : "У вас пока нет доступа ни к одному курсу — обратитесь к автору курса."}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
