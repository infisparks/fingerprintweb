import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Get the current file name and directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a compatibility layer instance with the current directory as the base.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Define your ESLint config extending Next.js recommended presets.
// Here we extend Next.js core web vitals and TypeScript rules.
// You can also add custom rules below in a separate object.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Example of custom rules:
      // Disable the rule for explicit any if needed.
      "@typescript-eslint/no-explicit-any": "off",
      // Add further rules as per your project requirements.
    },
  },
];

export default eslintConfig;
