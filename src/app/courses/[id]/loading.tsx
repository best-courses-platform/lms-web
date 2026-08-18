import { Skeleton } from "@/components/ui/skeleton";

export default function CourseLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Skeleton className="mb-6 aspect-[21/9] w-full rounded-2xl" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-4 h-9 w-2/3" />
      <Skeleton className="mt-3 h-20 w-full" />
    </div>
  );
}
