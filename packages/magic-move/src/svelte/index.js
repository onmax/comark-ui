// `::magic-move` and its steps for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-magic-move`.
import MagicMove from "./MagicMove.svelte";
import MagicMoveStep from "./MagicMoveStep.svelte";

export { default } from "comark-magic-move";
export { MagicMove, MagicMoveStep };
export const components = { MagicMove, MagicMoveStep };
