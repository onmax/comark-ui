// Tables for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-table`.
import DataTable from "./DataTable.svelte";

export { default, TABLE_TAG } from "comark-table";
export { DataTable };
export const components = { DataTable };
