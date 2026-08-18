import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { getCurrentUser } from "@/lib/api/auth.server";

// Server Component — узнаёт, залогинен ли пользователь, по cookie текущего запроса
// (getCurrentUser гасит 401/403 в null, гость — не ошибка). Из мокапов Skillbox оставлены
// только логотип и один пункт навигации — подарки/чат/уведомления/"Центр карьеры"
// в нашем продукте не существуют, ссылки на них были бы обманом интерфейса.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Best Courses
          </Link>
          <nav>
            <Link
              href="/courses"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Каталог курсов
            </Link>
          </nav>
        </div>

        {user ? (
          <UserMenu user={user} />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Регистрация</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
