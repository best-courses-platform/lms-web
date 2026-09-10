import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Стабильный top-level ключ с Next 16.2 (не experimental) — требует babel-plugin-react-compiler
  // в devDependencies. Автоматически мемоизирует компоненты/хуки на этапе сборки, убирая
  // необходимость в ручных useMemo/useCallback/React.memo как средстве оптимизации.
  reactCompiler: true,
};

export default nextConfig;
