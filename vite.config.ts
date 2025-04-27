import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // TODO: remove hardcoded /jenkins/
  base: "/jenkins/plugin/pipeline-graph-view/js/bundles/",
  build: {
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
