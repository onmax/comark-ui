import type { Component, Snippet } from "svelte";
import type { TableAttributes } from "comark-table";

export { default, TABLE_TAG } from "comark-table";
export type { TableAttributes, TableMeta, TableOptions, TableReader } from "comark-table";

export declare const DataTable: Component<TableAttributes & { children?: Snippet }>;
export declare const components: { DataTable: typeof DataTable };
