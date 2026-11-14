import { definePackage } from "../../tsdown.shared.ts";

export default definePackage({
  entry: ["src/index.ts", "src/html.ts", "src/font.ts", "src/tour.ts", "src/cli.ts"],
  exports: {
    exclude: ["cli"],
    bin: { "comark-annotate": "src/cli.ts" },
  },
});
