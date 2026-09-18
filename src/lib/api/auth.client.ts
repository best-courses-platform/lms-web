import "client-only";
import { apiClient } from "./http-client";
import type { User } from "./types";

// Формы логина/регистрации — Client Components, вызывают эти функции напрямую из браузера.
// register() намеренно не возвращает токен — express-lms больше не выдаёт сессию до
// подтверждения email (см. Рефакторинг проблем/9 в express-lms), полноценный логин —
// только через login() после verifyEmail().
export function login(email: string, password: string) {
  return apiClient<{ message: string; token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: { name: string; email: string; password: string; confirmPassword: string }) {
  return apiClient<{ message: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyEmail(token: string) {
  return apiClient<{ message: string; user: User }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// Ровно одно из двух: email (письмо не пришло) либо token из просроченной ссылки (аккаунт
// бэкенд находит по токену). Бэкенд отвечает одинаково для любого случая — незнакомый
// email/токен, уже подтверждённый аккаунт, серверная пауза (защита от user enumeration, см.
// authService.resendVerificationEmail): по ответу нельзя понять, ушло ли письмо реально,
// UI обязан показывать нейтральный текст.
export function resendVerification(target: { email: string } | { token: string }) {
  return apiClient<{ message: string }>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(target),
  });
}

export function logout() {
  return apiClient<{ message: string }>("/api/auth/logout", { method: "POST" });
}

// Экран "активные сессии" (/dashboard/sessions) — завершить одну чужую сессию/устройство.
// Бэкенд отдаёт 204 без тела (см. auth.controller.ts#deleteSession), apiClient/parseResponse
// это отражают как T = void.
export function revokeSession(id: string) {
  return apiClient<void>(`/api/auth/sessions/${id}`, { method: "DELETE" });
}

// В отличие от logout() — гасит вообще все сессии пользователя, включая текущую (см.
// authService.revokeAllForUser с reason 'logout-all'). Cookie после этого мертва — вызывающий
// компонент сам решает, куда редиректить (см. sessions-list.tsx).
export function logoutAll() {
  return apiClient<{ message: string }>("/api/auth/logout-all", { method: "POST" });
}
