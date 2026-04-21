import path from "node:path";
import { fileURLToPath } from "node:url";

/** Next app root (where postcss.config.mjs lives). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    "@tailwindcss/postcss": {
      // Default is process.cwd(); parent-folder workspaces break @source scanning.
      base: appRoot,
    },
  },
};
