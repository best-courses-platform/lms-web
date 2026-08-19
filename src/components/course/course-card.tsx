import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/course/difficulty-badge";
import type { Course } from "@/lib/api/types";

const MAX_VISIBLE_TAGS = 3;

export function CourseCard({ course }: { course: Course }) {
  const visibleTags = course.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagsCount = course.tags.length - visibleTags.length;

  return (
    <Link
      href={`/courses/${course._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {/* Обычный <img>, не next/image: previewImage — произвольный URL (валидируется
            на бэкенде только как .url(), без ограничения на конкретный хост), next/image
            оптимизирует только заранее известные/доверенные домены через remotePatterns. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.previewImage}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold tracking-tight">{course.title}</h3>
          {course.averageRating != null && course.averageRating > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {course.averageRating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Черновик виден только автору/allowedUsers (canAccess на бэкенде) — на публичном
            каталоге (только published-курсы) эта ветка никогда не рендерится. */}
        {!course.isPublished && (
          <Badge variant="outline" className="w-fit border-dashed text-muted-foreground">
            Черновик
          </Badge>
        )}

        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <DifficultyBadge difficulty={course.difficulty} />
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {hiddenTagsCount > 0 && <Badge variant="secondary">+{hiddenTagsCount}</Badge>}
        </div>
      </div>
    </Link>
  );
}
