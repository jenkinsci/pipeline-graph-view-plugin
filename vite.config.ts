import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from 'vite-plugin-checker';
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
    cssInjectedByJsPlugin({
      relativeCSSInjection: true,
    }),
  ],
  build: {
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        "pipeline-console-view":
          "src/main/frontend/pipeline-console-view/index.tsx",
        "pipeline-graph-view":
          "src/main/frontend/pipeline-graph-view/index.tsx",
        "multi-pipeline-graph-view":
          "src/main/frontend/multi-pipeline-graph-view/index.tsx",
      },
      output: {
        entryFileNames: "[name]-bundle.js",
        dir: "src/main/webapp/js/bundles",
      },
    },
  },
});
