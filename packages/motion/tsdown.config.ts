import { Rolldown } from "tsdown";
import { definePackage } from "../../tsdown.shared.ts";

// The HTML renderer inlines the motion layer as one script, so the build bundles it with Comark's effects first. Every
// other entry imports `@vite-hub/ui/motion/core`, which the build also bundles, so no app installs `@vite-hub/ui`.
const bundle = await Rolldown.rolldown({
  input: new URL("src/inline.ts", import.meta.url).pathname,
  platform: "browser",
});
const { output } = await bundle.generate({ format: "iife", minify: true });
await bundle.close();
const [script] = output;

export default definePackage({
  entry: ["src/index.ts", "src/client.ts", "src/html.ts", "src/vue.ts", "src/react.ts"],
  define: { __COMARK_MOTION_SCRIPT__: JSON.stringify(script.code.trim()) },
  copy: [{ from: "src/svelte", to: "dist" }],
});
