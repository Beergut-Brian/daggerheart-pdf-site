import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // design boards and agent files are not app code
    "design/**",
    ".claude/**",
    "public/**",
    "test-results/**",
    "playwright-report/**",
    // direct port of the approved board's salt engine (untyped by design; its public API is typed)
    "app/lib/salt-engine.ts",
  ]),
]);

export default eslintConfig;
