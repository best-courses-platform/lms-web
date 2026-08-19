"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

function noopSubscribe() {
  return () => {};
}

// resolvedTheme недоступен до маунта на клиенте (next-themes читает localStorage
// уже после гидратации) — рендерим нейтральную заглушку первым кадром, чтобы не
// словить hydration mismatch и не мигнуть неверной иконкой. useSyncExternalStore
// с разными server/client snapshot — вместо useEffect+setState, чтобы не ловить
// каскадный лишний рендер (react-hooks/set-state-in-effect).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="Переключить тему">
        <Sun />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
