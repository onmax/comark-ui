// `:icon` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-icon`.
import Icon from "./Icon.svelte";

export {
  createIcons,
  default,
  describeIconProblem,
  ICON_TAG,
  iconProblemRule,
  parseIconName,
} from "comark-icon";
export { Icon };
export const components = { Icon };
