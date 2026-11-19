import type { NodeHandler, State } from "comark";
import { RUNTIME_TAG } from "./index.ts";
import { inlineScript } from "../../../shared/html.ts";

export { default, RUNTIME_TAG } from "./index.ts";

// The build bundles src/inline.ts, the motion layer with Comark's effects, into this text.
declare const __COMARK_MOTION_SCRIPT__: string;

/**
 * The text of the inline `<script>` that starts the motion layer. It's the same on every render and changes only
 * between versions, so a page with a strict Content Security Policy can allow it by its hash.
 */
export const motionScript: string = inlineScript(__COMARK_MOTION_SCRIPT__);

/**
 * The inline scripts this renderer writes, each exactly as it goes in its `<script>`, so a page with a strict Content
 * Security Policy can allow them by hash or add its nonce.
 */
export const scripts: string[] = [motionScript];

// Each render gets a fresh `state.context`, so a document carries the script once.
const started = new WeakSet<object>();

function runtime(state: State): string {
  if (started.has(state.context)) return "";
  started.add(state.context);
  return `<script>${motionScript}</script>`;
}

/** The HTML renderer of the node that the plugin adds. Pass it as `components`. */
export const components: Record<typeof RUNTIME_TAG, NodeHandler> = {
  [RUNTIME_TAG]: (_node, state) => runtime(state),
};
