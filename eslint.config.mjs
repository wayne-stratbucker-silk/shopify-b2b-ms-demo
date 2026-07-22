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
      // Shopify Functions extensions ship their own toolchain (Javy + CLI
      // codegen) and reference generated types that don't exist until
      // `shopify app function typegen` runs — not part of the Next.js lint.
      "extensions/**",
    ],
  },
];

export default eslintConfig;
