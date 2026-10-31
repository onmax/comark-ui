import { renderHtml } from "@comark/html";
import { describe, expect, it } from "vite-plus/test";
import { comarkOptions } from "./support/index.ts";

// The code the rewrite generates has to typecheck in a TypeScript project; `tsc -p .` covers this file.
describe("comarkOptions in generated code", () => {
  it("goes straight into renderHtml, alone or with components", async () => {
    expect(
      await renderHtml("# Hi", comarkOptions({ html: false, gfm: false, frontmatter: false })),
    ).toContain("Hi");
    expect(await renderHtml("# Hi", { ...comarkOptions(), components: {} })).toContain("Hi");
  });
});
