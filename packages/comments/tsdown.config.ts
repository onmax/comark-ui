import { definePackage } from "../../tsdown.shared.ts";
import { css } from "./src/styles.ts";

export default definePackage({
  entry: ["src/index.ts", "src/html.ts"],
  plugins: [
    {
      // For apps that draw marks or cards outside a rendered document, which is the only place the renderer adds them.
      name: "style-css",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "style.css", source: css });
      },
    },
  ],
});
