import { defineComponentsPackage } from "../../tsdown.shared.ts";
import { css } from "./src/styles.ts";

export default defineComponentsPackage(css, ["src/svg.ts", "src/server.ts"]);
