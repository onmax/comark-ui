import { definePackage } from "../../tsdown.shared.ts";
import { css } from "./src/styles.ts";

// No HTML renderer: a chat message is rendered by the app's framework, not as a document.
export default definePackage({
  entry: ["src/index.ts", "src/client.ts", "src/vue.ts", "src/react.ts"],
  copy: [{ from: "src/svelte", to: "dist" }],
  plugins: [
    {
      name: "style-css",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "style.css", source: css });
      },
    },
  ],
});
