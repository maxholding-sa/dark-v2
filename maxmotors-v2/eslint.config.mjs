import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Enforce the layering contract: UI never reaches the database directly.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/db/*", "@prisma/client"],
              message:
                "UI and feature code must go through a module service (src/server/modules/<domain>/*.service.ts), never the database client directly.",
            },
          ],
        },
      ],
    },
  },
  {
    // The server layer is the one place allowed to touch the database.
    files: ["src/server/**/*.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx", "*.config.ts", "*.config.mjs"],
    rules: { "no-console": "off", "no-restricted-imports": "off" },
  },
];

export default config;
