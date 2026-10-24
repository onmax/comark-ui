// `::steps` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-steps`.
import Step from "./Step.svelte";
import Steps from "./Steps.svelte";

export { default } from "comark-steps";
export { Step, Steps };
export const components = { Steps, Step };
