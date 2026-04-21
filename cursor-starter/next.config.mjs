import path from "node:path";
import { fileURLToPath } from "node:url";

/** Directory containing this config file (the Next app root). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));
/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
