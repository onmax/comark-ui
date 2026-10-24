// `::file-tree` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-file-tree`.
import FileTree from "./FileTree.svelte";
import FileTreeItem from "./FileTreeItem.svelte";

export { default } from "comark-file-tree";
export { FileTree, FileTreeItem };
export const components = { FileTree, FileTreeItem };
