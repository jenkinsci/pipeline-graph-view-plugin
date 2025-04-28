import neostandard, { resolveIgnoresFromGitignore, plugins } from "neostandard";

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
];
