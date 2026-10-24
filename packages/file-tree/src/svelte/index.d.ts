import type { Component, Snippet } from "svelte";
import type { IconData } from "comark-icon";

export { default } from "comark-file-tree";
export type {
  EntryState,
  FileTreeItemAttributes,
  FileTreeMeta,
  FileTreeOptions,
} from "comark-file-tree";

export declare const FileTree: Component<{ children?: Snippet }>;
export declare const FileTreeItem: Component<{
  type?: string;
  name?: string;
  state?: string;
  note?: string;
  icon?: IconData;
  children?: Snippet;
}>;
export declare const components: { FileTree: typeof FileTree; FileTreeItem: typeof FileTreeItem };
