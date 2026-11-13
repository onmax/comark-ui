// `::git-graph` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-git-graph`.
import GitGraph from "./GitGraph.svelte";
import GitGraphLines from "./GitGraphLines.svelte";

export { default } from "comark-git-graph";
export { GitGraph, GitGraphLines };
export const components = { GitGraph, GitGraphLines };
