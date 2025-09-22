import { Opts } from "linkifyjs";

export const linkifyJsOptions: Opts = {
  rel: "noopener noreferrer",
  validate: {
    url: (value) => /^https?:\/\//.test(value),
  },
};
