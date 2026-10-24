// `::details`, `::accordion`, and `::collapsible` for `@comark/svelte`. Pass `components` to it; the parse plugin comes
// from `comark-details`.
import Accordion from "./Accordion.svelte";
import Disclosure from "./Disclosure.svelte";
import DisclosureSummary from "./DisclosureSummary.svelte";

export { default } from "comark-details";
export { Accordion, Disclosure, DisclosureSummary };
export const components = { Accordion, Disclosure, DisclosureSummary };
