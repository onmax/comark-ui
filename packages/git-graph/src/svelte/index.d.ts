import type { Component, Snippet } from "svelte";
import type { GitGraphAttributes, GitGraphLinesAttributes } from "comark-git-graph";

export { default } from "comark-git-graph";
export type { GitGraphAttributes, GitGraphLinesAttributes, GitGraphMeta } from "comark-git-graph";

export declare const GitGraph: Component<GitGraphAttributes & { children?: Snippet }>;
export declare const GitGraphLines: Component<GitGraphLinesAttributes>;
export declare const components: { GitGraph: typeof GitGraph; GitGraphLines: typeof GitGraphLines };
