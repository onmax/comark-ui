// What the tests compare with: remark's HTML, Comark's tree as HTML, and the normalized diff between them.
export * from "../../src/index.ts";
export { footnotes, gfmLinks, htmlWhitespace, tightLists } from "../../src/plugins/gfm.ts";
export { frontmatter } from "../../src/plugins/frontmatter.ts";
export { compare, type Comparison, type Difference } from "./compare.ts";
export { normalize, BENIGN } from "./normalize.ts";
export { comarkHtml, remarkHtml, type RemarkSetup } from "./pipelines.ts";
