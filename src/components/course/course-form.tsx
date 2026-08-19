"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_LABELS } from "@/components/course/difficulty-badge";
import { createCourse, updateCourse, uploadCoursePreviewImage } from "@/lib/api/courses.client";
import { ApiError } from "@/lib/api/core";
import type { Course, Difficulty } from "@/lib/api/types";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

// Одна форма на создание и редактирование — отличаются только начальными значениями
// полей и тем, что дёрнуть на сабмите (createCourse/updateCourse). course === undefined
// значит "создание".
export function CourseForm({ course }: { course?: Course }) {
  const router = useRouter();
  const isEdit = course != null;

  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [previewImage, setPreviewImage] = useState(course?.previewImage ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(course?.difficulty ?? "beginner");
  const [isPublished, setIsPublished] = useState(course?.isPublished ?? false);
  const [tags, setTags] = useState<string[]>(course?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяет выбрать тот же файл повторно после ошибки
    if (!file) {
      return;
    }

    setImageError(null);
    setUploadingImage(true);
    try {
      const { url } = await uploadCoursePreviewImage(file);
      setPreviewImage(url);
    } catch (err) {
      setImageError(err instanceof ApiError ? err.message : "Не удалось загрузить обложку, попробуйте ещё раз");
    } finally {
      setUploadingImage(false);
    }
  }

  function addTag() {
    const tag = tagInput.trim();
    setTagInput("");
    if (!tag || tag.length > MAX_TAG_LENGTH || tags.length >= MAX_TAGS || tags.includes(tag)) {
      return;
    }
    setTags([...tags, tag]);
  }

  function handleTagInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!previewImage) {
      setError("Загрузите обложку курса");
      return;
    }

    setPending(true);

    const payload = { title, description, previewImage, tags, difficulty, isPublished };

    try {
      const result = isEdit ? await updateCourse(course._id, payload) : await createCourse(payload);
      toast.success(isEdit ? "Курс обновлён" : "Курс создан");
      router.push(`/courses/${result.course._id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Не удалось ${isEdit ? "сохранить" : "создать"} курс, попробуйте ещё раз`
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Название</Label>
        <Input
          id="title"
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="previewImageFile">Обложка</Label>
        <Input
          id="previewImageFile"
          type="file"
          accept="image/*"
          disabled={uploadingImage}
          onChange={handleFileChange}
        />
        {uploadingImage && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загружаем...
          </p>
        )}
        {imageError && <p className="text-sm text-destructive">{imageError}</p>}
        {previewImage && !uploadingImage && (
          <div className="mt-1 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="" className="size-full object-cover" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="difficulty">Сложность</Label>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
          <SelectTrigger id="difficulty" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Теги</Label>
        <Input
          id="tags"
          placeholder="Введите тег и нажмите Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagInputKeyDown}
          disabled={tags.length >= MAX_TAGS}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`Убрать тег ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="isPublished">{isEdit ? "Опубликован" : "Опубликовать сразу"}</Label>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Если выключить, курс станет черновиком — видимым только вам."
              : "Черновик виден только вам, пока вы его не опубликуете."}
          </p>
        </div>
        <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending || uploadingImage}>
        {pending ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать курс"}
      </Button>
    </form>
  );
}
