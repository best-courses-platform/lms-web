import { Skeleton } from "@/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="mb-6 h-9 w-2/3" />
      <Skeleton className="mb-8 aspect-video w-full rounded-2xl" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
