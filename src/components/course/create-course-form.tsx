"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
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
import { createCourse } from "@/lib/api/courses.client";
import { ApiError } from "@/lib/api/core";
import type { Difficulty } from "@/lib/api/types";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export function CreateCourseForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    setPending(true);

    try {
      const { course } = await createCourse({
        title,
        description,
        previewImage,
        tags,
        difficulty,
        isPublished,
      });
      toast.success("Курс создан");
      router.push(`/courses/${course._id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать курс, попробуйте ещё раз");
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
        <Label htmlFor="previewImage">Ссылка на обложку</Label>
        <Input
          id="previewImage"
          type="url"
          required
          placeholder="https://..."
          value={previewImage}
          onChange={(e) => setPreviewImage(e.target.value)}
        />
        {previewImage && (
          <div className="mt-1 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="" className="size-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
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
          <Label htmlFor="isPublished">Опубликовать сразу</Label>
          <p className="text-sm text-muted-foreground">
            Черновик виден только вам, пока вы его не опубликуете.
          </p>
        </div>
        <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Создаём..." : "Создать курс"}
      </Button>
    </form>
  );
}
