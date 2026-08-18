import type { Metadata } from "next";
import { CourseCard } from "@/components/course/course-card";
import { getPublishedCourses } from "@/lib/api/courses.server";

export const metadata: Metadata = { title: "Каталог курсов — Best Courses" };

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Каталог курсов</h1>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">Пока нет ни одного опубликованного курса.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
