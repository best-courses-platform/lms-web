"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { enrollStudent, unenrollStudent } from "@/lib/api/enrollments.client";
import { ApiError } from "@/lib/api/core";
import { getEnrollmentUserId, type Enrollment, type EnrollmentStudent } from "@/lib/api/types";

function studentsWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "студент";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "студента";
  return "студентов";
}

// userId в ответе GET .../enrollments всегда популейчен (name/email) — в отличие от
// POST-ответа (см. enrollment.controller.ts#enroll в express-lms), но тип общий для обоих
// (Enrollment["userId"] — union), поэтому здесь на всякий случай fallback на голый id.
function studentLabel(userId: Enrollment["userId"]): string {
  if (typeof userId === "string") return userId;
  const student = userId as EnrollmentStudent;
  return `${student.name} (${student.email})`;
}

export function EnrolledStudents({ courseId, initialStudents }: { courseId: string; initialStudents: Enrollment[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [email, setEmail] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setEnrolling(true);
    try {
      const { enrollment } = await enrollStudent(courseId, email.trim());
      setStudents((prev) => [enrollment, ...prev]);
      setEmail("");
      toast.success("Студент записан на курс");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось записать студента, попробуйте ещё раз");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenroll(userId: string) {
    setRevokingUserId(userId);
    try {
      await unenrollStudent(courseId, userId);
      setStudents((prev) => prev.filter((s) => getEnrollmentUserId(s.userId) !== userId));
      toast.success("Студент отчислен");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось отчислить студента, попробуйте ещё раз");
    } finally {
      setRevokingUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleEnroll} className="flex flex-wrap items-center gap-2">
        <Input
          type="email"
          required
          placeholder="email студента"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enrolling}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={enrolling}>
          {enrolling ? <Loader2 className="size-4 animate-spin" /> : <UserPlus />}
          Записать
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {students.length} {studentsWord(students.length)}
      </p>

      {students.length > 0 && (
        <div className="flex flex-col gap-2">
          {students.map((enrollment) => {
            const userId = getEnrollmentUserId(enrollment.userId);
            return (
              <Card key={enrollment._id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm">{studentLabel(enrollment.userId)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingUserId === userId}
                    onClick={() => handleUnenroll(userId)}
                  >
                    {revokingUserId === userId ? <Loader2 className="size-4 animate-spin" /> : <UserX />}
                    Отчислить
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
