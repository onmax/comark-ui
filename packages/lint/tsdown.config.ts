import { definePackage } from "../../tsdown.shared.ts";

export default definePackage({
  entry: ["src/index.ts", "src/doctor.ts", "src/eslint.ts", "src/eslint-worker.ts", "src/cli.ts"],
  exports: {
    exclude: ["cli", "eslint-worker"],
    bin: { "lint-comark": "src/cli.ts" },
  },
});
