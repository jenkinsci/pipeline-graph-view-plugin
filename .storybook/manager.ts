import { addons } from "storybook/manager-api";

// The stories are fixed examples, so there's nothing to use the addons panel for
addons.setConfig({
  showPanel: false,
});
