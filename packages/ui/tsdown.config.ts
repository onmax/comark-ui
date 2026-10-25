import { definePackage } from "../../tsdown.shared.ts";

export default definePackage({
  entry: ["src/index.ts", "src/client.ts", "src/editor.ts", "src/editor-vue.ts", "src/html.ts", "src/vue.ts", "src/react.ts"],
  // Svelte entries ship as source, like every package's. The agent skill ships too, so an app that serves skills to its
  // own agents bundles the one that matches the plugins it installed.
  copy: [
    { from: "src/svelte", to: "dist" },
    { from: "../../skills/comark-ui", to: "dist/skills" },
  ],
});
