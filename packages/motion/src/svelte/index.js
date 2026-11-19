// The motion layer for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-motion`.
import MotionRuntime from "./MotionRuntime.svelte";

export { default, RUNTIME_TAG } from "comark-motion";
export { MotionRuntime };
export const components = { MotionRuntime };
