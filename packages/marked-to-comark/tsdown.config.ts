import { definePackage } from "../../tsdown.shared.ts";

export default definePackage({
  entry: ["src/index.ts", "src/setup.ts", "src/plugins/index.ts", "src/doctor.ts", "src/cli.ts"],
  exports: {
    exclude: ["cli"],
    bin: { "marked-to-comark": "src/cli.ts" },
  },
});
