// `::field-group` and `::field` for `@comark/svelte`. Pass `components` to it; the parse plugin comes from `comark-fields`.
import Field from "./Field.svelte";
import FieldGroup from "./FieldGroup.svelte";

export { default } from "comark-fields";
export { Field, FieldGroup };
export const components = { Field, FieldGroup };
