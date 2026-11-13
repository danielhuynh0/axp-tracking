import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("apps/api/dist", { recursive: true });
await build({
  entryPoints: ["apps/api/src/handler.ts"],
  outfile: "apps/api/dist/handler.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  sourcemap: true,
});
// The Lambda artifact is self-contained, including the AWS SDK.
await writeFile("apps/api/dist/package.json", JSON.stringify({
  name: "axp-lambda-artifact", version: "0.1.0", private: true, type: "commonjs",
}));
