import { Download, FileText, Link2 } from "lucide-react";
import { formatFileSize } from "@/lib/format";
import type { LessonResource } from "@/lib/api/types";

export function LessonResources({ resources }: { resources: LessonResource[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
      {resources.map((resource, index) => {
        const isLink = resource.type === "link";
        const size = formatFileSize(resource.fileSize);

        return (
          <li key={index}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent"
            >
              {isLink ? (
                <Link2 className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">{resource.title}</p>
                {resource.description && (
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                )}
                {size && <p className="text-xs text-muted-foreground">{size}</p>}
              </div>
              {!isLink && <Download className="size-4 shrink-0 text-muted-foreground" />}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
