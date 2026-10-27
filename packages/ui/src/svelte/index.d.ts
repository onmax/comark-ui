import type { Component } from "svelte";
import type { Preset, PresetOptions } from "comark-ui";

export { criticCss } from "comark-ui";
export type { PresetOptions } from "comark-ui";

/** Every plugin with components for `@comark/svelte`, which leaves out annotate, diff, and quiz. */
declare const comarkUi: (options?: PresetOptions) => Preset<Component>;
export default comarkUi;
