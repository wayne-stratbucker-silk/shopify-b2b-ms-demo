import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Parallel-agent git worktrees live under .claude/ and carry their own
      // copies of the source (often with their own node_modules). Linting the
      // repo root would otherwise descend into them and report tens of
      // thousands of phantom problems from code that isn't part of this tree.
      ".claude/**",
      // Stray nested build-output dir (accidental `.next` under a same-named
      // folder); gitignored, not part of the app.
      "shopify-b2b-ms-demo/**",
      // Shopify Functions extensions ship their own toolchain (Javy + CLI
      // codegen) and reference generated types that don't exist until
      // `shopify app function typegen` runs — not part of the Next.js lint.
      "extensions/**",
    ],
  },
  {
    rules: {
      // Honor the `_`-prefix convention for intentionally-unused bindings:
      // unused args, unused vars, unused catch params, and rest-spread "omit"
      // destructures like `const { secret: _secret, ...rest } = obj`. Keeps
      // deliberate discards from tripping the unused-vars rule.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
