import type { Component, Snippet } from "svelte";

export { CALLOUT_TAG, callouts, html, references } from "comark-github";
export type { CalloutsOptions, CalloutType, GitHubMeta, ReferencesOptions } from "comark-github";

export declare const GithubCallout: Component<{
  type?: string;
  title?: string;
  children?: Snippet;
}>;
export declare const components: { GithubCallout: typeof GithubCallout };
