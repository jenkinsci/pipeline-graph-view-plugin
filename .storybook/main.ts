import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/main/frontend/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: {
        // The project's config builds the plugin's bundles, which would
        // override Storybook's own build
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
};

export default config;
