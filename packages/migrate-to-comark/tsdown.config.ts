import { definePackage } from "../../tsdown.shared.ts";

export default definePackage({
  entry: ["src/index.ts", "src/cli.ts"],
  exports: {
    exclude: ["cli"],
    bin: { "migrate-to-comark": "src/cli.ts" },
  },
});
