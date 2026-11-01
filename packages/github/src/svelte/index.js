// Callouts for `@comark/svelte`. Pass `components` to it; the parse plugins come from `comark-github`.
import GithubCallout from "./GithubCallout.svelte";

export { CALLOUT_TAG, callouts, html, HTML_TAGS, references } from "comark-github";
export { GithubCallout };
export const components = { GithubCallout };
