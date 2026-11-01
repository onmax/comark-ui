// `comark-ui/typeset.css` is for an app that renders Comark content outside a document, such as a rich-text editor.
// It comes from the build, so this reads it as a consumer would, through the package's exports.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { typesetStylesheet } from "comark-ui";
import { typesetStylesheet as clientStylesheet } from "comark-ui/client";
import { expect, it } from "vite-plus/test";

const require = createRequire(import.meta.url);

it("ships the typeset styles as a stylesheet scoped to .comark-typeset", () => {
  const css = readFileSync(require.resolve("comark-ui/typeset.css"), "utf8");
  expect(css).toBe(typesetStylesheet());
  expect(css).toContain("@layer comark{@layer typeset{@scope (.comark-typeset){");
  expect(css).toContain(":where(:scope){--_comark-background:var(--comark-background,");
  expect(css).toContain("calc(var(--typeset-size,1em) * 1.125)");
  expect(css).toContain("&:where(.footnotes,[data-footnotes])");
  expect(css).toContain(
    '.shiki:where(.dark *) span{&[style*="--shiki-dark:"]{color:var(--shiki-dark) !important;}',
  );
  expect(css).toContain(
    '&[style*="--shiki-dark-font-style:"]{font-style:var(--shiki-dark-font-style) !important;}',
  );
  expect(css).toContain("&:where(:is(p,li,td,th,a) img){margin-block-start:0;}");
});

it("scopes the same styles to a class of the app's choosing, from the client entry too", () => {
  expect(typesetStylesheet(".prose-editor")).toContain("@scope (.prose-editor){");
  expect(clientStylesheet(".prose-editor")).toBe(typesetStylesheet(".prose-editor"));
});
