import { useEffect } from "react";
import { start } from "./client.ts";

export { default, RUNTIME_TAG } from "./index.ts";

/** Starts the motion layer while a document is on the page. The plugin adds it to every document. */
export function MotionRuntime() {
  useEffect(() => start(), []);
  return null;
}

/** Pass these as `components` to `@comark/react`. */
export const components = { MotionRuntime };
