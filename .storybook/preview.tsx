// Extracted from Jenkins core by main.ts
import "./jenkins/jsbundles/styles.css";

import type { Preview } from "@storybook/react-vite";

import { UserPreferencesProvider } from "../src/main/frontend/common/user/user-preferences-provider.tsx";

const preview: Preview = {
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <UserPreferencesProvider>
        <Story />
      </UserPreferencesProvider>
    ),
  ],
};

export default preview;
