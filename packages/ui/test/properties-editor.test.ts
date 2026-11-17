import { expect, it } from "vite-plus/test";
import properties from "comark-properties";
import { checkMarkdown } from "../src/editor/markdown.ts";

it("keeps dated properties editable across serialization", async () => {
  const source = "---\ndate: 2026-11-02\n---\n\nBody\n";
  const page = { plugins: [properties()] };
  const check = await checkMarkdown(source, page);
  expect(check.editable).toBe(true);
  if (check.editable) expect(await checkMarkdown(check.markdown, page)).toEqual(check);
});
