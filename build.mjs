import { glob } from "glob";
import { build } from "esbuild";

const entryPoints = await glob("src/**/*.ts"); // Find all TS files in src/

await build({
  entryPoints,
  outdir: "dist",
  format: "esm",
  platform: "browser",
  target: "es2024",
  loader: {
    ".json": "json",
  },
  bundle: true,
  // bundle: false,
  external: ["@minecraft/server", "@minecraft/server-ui"],
});
