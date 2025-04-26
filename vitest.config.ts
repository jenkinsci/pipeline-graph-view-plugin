import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    root: "src/main/frontend",
    globals: true,
    environment: "jsdom",
    setupFiles: ["setupTests.ts"],
    reporters: ["default", "junit"],
    outputFile: path.resolve(
      import.meta.dirname,
      "target/surefire-reports/vitest-junit.xml",
    ),
  },
});
