"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Download, FileText, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSize } from "@/lib/format";
import { deleteLessonFile, deleteLessonResource, uploadLessonFile } from "@/lib/api/lessons.client";
import { ApiError } from "@/lib/api/core";
import type { Lesson } from "@/lib/api/types";

export function LessonMediaManager({ lesson }: { lesson: Lesson }) {
  const router = useRouter();

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");

  async function handleVideoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    setUploadingVideo(true);
    try {
      await uploadLessonFile(lesson._id, file, "video");
      toast.success("Видео загружено");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось загрузить видео");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleDeleteVideo() {
    if (!lesson.videoFile?.url) {
      return;
    }
    setDeletingVideo(true);
    try {
      await deleteLessonFile(lesson._id, lesson.videoFile.url, "video");
      toast.success("Видео удалено");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось удалить видео");
    } finally {
      setDeletingVideo(false);
    }
  }

  async function handleResourceChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    setUploadingResource(true);
    try {
      await uploadLessonFile(lesson._id, file, "resource", { title: resourceTitle || undefined });
      setResourceTitle("");
      toast.success("Материал загружен");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось загрузить материал");
    } finally {
      setUploadingResource(false);
    }
  }

  async function handleDeleteResource(index: number) {
    setDeletingIndex(index);
    try {
      await deleteLessonResource(lesson._id, index);
      toast.success("Материал удалён");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось удалить материал");
    } finally {
      setDeletingIndex(null);
    }
  }

  return (
    <section className="mt-8 flex flex-col gap-6 rounded-2xl border border-dashed border-border p-5">
      <h2 className="text-sm font-medium text-muted-foreground">Управление уроком (видно только автору)</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="video">Видео</Label>
        {lesson.videoFile?.url && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="truncate">{lesson.videoFile.originalName ?? lesson.videoFile.url}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={deletingVideo || uploadingVideo}
              onClick={handleDeleteVideo}
              aria-label="Удалить видео"
            >
              {deletingVideo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        )}
        <Input
          id="video"
          type="file"
          accept="video/*"
          disabled={uploadingVideo || deletingVideo}
          onChange={handleVideoChange}
        />
        {uploadingVideo && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загружаем видео...
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {lesson.videoFile?.url ? "Новая загрузка заменит текущее видео." : "Видео пока не загружено."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Материалы</Label>
        {lesson.resources && lesson.resources.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {lesson.resources.map((resource, index) => {
              const Icon = resource.type === "link" ? Link2 : FileText;
              return (
                <li key={`${resource.title}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{resource.title}</p>
                    {resource.fileSize != null && (
                      <p className="text-xs text-muted-foreground">{formatFileSize(resource.fileSize)}</p>
                    )}
                  </div>
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label="Скачать">
                      <Download className="size-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingIndex != null || uploadingResource}
                    onClick={() => handleDeleteResource(index)}
                    aria-label={`Удалить материал ${resource.title}`}
                  >
                    {deletingIndex === index ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <Input
          placeholder="Название материала (необязательно)"
          value={resourceTitle}
          onChange={(e) => setResourceTitle(e.target.value)}
          disabled={uploadingResource || deletingIndex != null}
        />
        <Input
          id="resource"
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
          disabled={uploadingResource || deletingIndex != null}
          onChange={handleResourceChange}
        />
        {uploadingResource && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загружаем материал...
          </p>
        )}
      </div>
    </section>
  );
}
