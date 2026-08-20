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
