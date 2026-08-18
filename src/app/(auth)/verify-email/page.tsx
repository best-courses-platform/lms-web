import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Подтверждение email — Best Courses" };

export default function VerifyEmailPage() {
  return (
    // useSearchParams (для ?token=... из ссылки в письме) требует Suspense-границу,
    // иначе Next.js откажется собрать страницу как полностью статическую.
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
