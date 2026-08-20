import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react умеет само регистрировать очистку DOM после каждого теста, но
// только если находит глобальный afterEach — а `test.globals` в vitest.config.mts выключен
// намеренно (везде явные import { describe, it, ... } from "vitest", не глобалы). Без этого
// render() из разных тестов одного файла накапливался в DOM молча — второй тест видел два
// смонтированных <LoginForm />, getByRole падал на "нашёл больше одного элемента", а
// значения инпутов из предыдущего теста утекали в следующий через один и тот же DOM.
afterEach(cleanup);

// apiUrl() (src/lib/api/core.ts) читает process.env.NEXT_PUBLIC_API_URL при каждом вызове и
// бросает, если он не задан — в реальном приложении это подстраховка от забытого .env.local,
// но в тестах компонентов (например, OAuthButtons внутри LoginForm вызывает apiUrl() прямо в
// теле рендера) это заставило бы каждый тест, рендерящий такой компонент, отдельно
// прокидывать переменную. Фиктивное фиксированное значение здесь — тот же принцип, что и
// process.env.* в express-lms/test/setupTestEnv.ts: единая, безопасная база по умолчанию,
// которую конкретный тест может переопределить/удалить локально (см. core.unit.spec.ts).
process.env.NEXT_PUBLIC_API_URL ??= "https://api.test.local";

// jsdom не реализует ResizeObserver — Radix (например, Switch через @radix-ui/react-use-size,
// используется в course-form.tsx) вызывает его в layout-эффекте при монтировании, без него
// падает с ReferenceError на любом рендере, даже не связанном напрямую с самим замером
// размера. Минимальный no-op достаточен — тестам не важны реальные измерения layout.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom тоже не реализует Pointer Capture API и scrollIntoView — Radix Select (course-form.tsx)
// вызывает element.hasPointerCapture()/scrollIntoView() при открытии дропдауна через клик по
// триггеру, без полифилла падает TypeError "hasPointerCapture is not a function" прямо
// в обработчике клика, вне try/catch теста (Unhandled Exception, а не обычный assertion fail).
if (typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.setPointerCapture === "undefined") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture === "undefined") {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom не реализует window.matchMedia — next-themes (ThemeProvider) обращается к нему в
// эффекте при монтировании, чтобы определить системную тему, даже при enableSystem={false}.
// Без полифилла падает TypeError на любом рендере реального (не замоканного) ThemeProvider.
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
