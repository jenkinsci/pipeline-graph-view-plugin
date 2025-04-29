import simpleImportSort from "eslint-plugin-simple-import-sort";
import neostandard, { plugins, resolveIgnoresFromGitignore } from "neostandard";

export default [
  ...neostandard({
    ignores: resolveIgnoresFromGitignore(),
    noStyle: true,
    ts: true,
  }),
  {
    ...plugins.react.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  plugins.n.configs["flat/recommended"],
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
];
