// `::card-group`, `::card`, and `::columns` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from
// `comark-cards`.
import Card from "./Card.svelte";
import CardGroup from "./CardGroup.svelte";
import CardTitle from "./CardTitle.svelte";
import Column from "./Column.svelte";
import Columns from "./Columns.svelte";

export { colors, default, variants } from "comark-cards";
export { Card, CardGroup, CardTitle, Column, Columns };
export const components = { Card, CardTitle, CardGroup, Columns, Column };
