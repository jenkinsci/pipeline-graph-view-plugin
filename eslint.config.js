import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import neostandard, { plugins, resolveIgnoresFromGitignore } from "neostandard";

export default [
  ...neostandard({
    ignores: resolveIgnoresFromGitignore(),
    noJsx: true,
    noStyle: true,
    ts: true,
  }),
  eslintReact.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  plugins.promise.configs["flat/recommended"],
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["default"],
              message: "Please use named imports instead.",
            },
            {
              name: "react-dom/client",
              importNames: ["default"],
              message: "Please use named imports instead.",
            },
          ],
        },
      ],
    },
  },
  {
    languageOptions: {
      globals: {
        dialog: "readonly",
        notificationBar: "readonly",
      },
    },
  },
];
