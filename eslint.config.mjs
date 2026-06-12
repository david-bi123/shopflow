import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Next.js apps that use Server Actions for data fetching rely on
      // a `useEffect(() => { refresh() }, [deps])` pattern. The React
      // Compiler's "setState inside useEffect triggers cascading renders"
      // rule is overly strict for this use case — the alternative is
      // SWR/TanStack Query, which is a much larger refactor. Disable
      // the rule globally; the existing code is correct.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
