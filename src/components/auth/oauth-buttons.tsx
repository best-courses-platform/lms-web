import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api/core";

// Обычные <a href>, не onClick/fetch: OAuth — это полноценный редирект браузера
// на страницу провайдера (accounts.google.com/github.com), а не XHR-запрос.
// apiUrl() безопасен и на клиенте, и на сервере — это просто сборка строки, без fetch.
export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" asChild>
        <a href={apiUrl("/api/auth/google")}>Продолжить с Google</a>
      </Button>
      <Button variant="outline" asChild>
        <a href={apiUrl("/api/auth/github")}>Продолжить с GitHub</a>
      </Button>
    </div>
  );
}
