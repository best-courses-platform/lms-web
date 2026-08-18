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

export function logout() {
  return apiClient<{ message: string }>("/api/auth/logout", { method: "POST" });
}
