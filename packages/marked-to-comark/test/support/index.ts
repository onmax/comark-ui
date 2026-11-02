// What the tests compare with: marked's HTML, Comark's tree as HTML, and the normalized diff between them.
export * from "../../src/index.ts";
export { compare, type Comparison, type Difference } from "./compare.ts";
export { normalize, BENIGN } from "./normalize.ts";
export { comarkHtml, markedHtml, type ComarkSetup } from "./pipelines.ts";
