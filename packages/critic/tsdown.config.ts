import { definePackage } from "../../tsdown.shared.ts";
import { css } from "./src/styles.ts";

export default definePackage({
  entry: ["src/index.ts"],
  plugins: [
    {
      // For apps that load the styles with their CSS; there's no component to add them.
      name: "style-css",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "style.css", source: css });
      },
    },
  ],
});
