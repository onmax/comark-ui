import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import tests, { components, type TestsOptions } from "../src/html.ts";

const root = new URL("fixtures/", import.meta.url).pathname;
const render = (markdown: string, options: TestsOptions = { root }) =>
  createHtmlRenderer({ plugins: [tests(options)], components })(markdown);
const issues = async (markdown: string, options: TestsOptions = { root }) =>
  (await parseMarkdown(markdown, { plugins: [tests(options)] })).meta.issues;
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const inline = (xml: string) => `::tests\n\`\`\`xml\n${xml}\n\`\`\`\n::`;

describe("comark-tests", () => {
  it("counts a JUnit report's results, sums its time, and opens each failure, with the styles once", async () => {
    const html = flat(
      await render(
        '::tests{src="junit.xml" title="Unit tests"}\n::\n\n::tests{src="junit.xml"}\n::',
      ),
    );
    expect(html).toContain(
      '<section class="ctr" data-status="failed" aria-label="Unit tests"><p class="ctr-summary"><strong class="ctr-title">Unit tests</strong>' +
        '<span class="ctr-count" data-kind="passed">2 passed</span><span class="ctr-count" data-kind="failed">2 failed</span>' +
        '<span class="ctr-count" data-kind="skipped">1 skipped</span><span class="ctr-time">4.2 s</span></p>',
    );
    expect(html).toContain(
      '<details class="ctr-failure"><summary>pond.test.ts › counts the geese & swans</summary><p class="ctr-message">expected 3 to be 4</p>' +
        '<pre class="ctr-stack"><code>AssertionError: expected 3 to be 4at pond.test.ts:12:20</code></pre></details>',
    );
    expect(html).toContain("TypeError: fetch failed &lt;plaza&gt;");
    expect(html.match(/<style data-comark-tests>/g)).toHaveLength(1);
  });

  it("reads a report pasted in an xml fence, with a single testsuite as its root", async () => {
    const html = flat(
      await render(
        inline('<testsuite name="a" time="0.25"><testcase name="one" time="0.25"/></testsuite>'),
      ),
    );
    expect(html).toContain(
      '<section class="ctr" data-status="passed" aria-label="Test results"><p class="ctr-summary"><span class="ctr-count" data-kind="passed">1 passed</span><span class="ctr-time">250 ms</span></p></section>',
    );
  });

  it("skips a doctype internal subset when its comment contains brackets", async () => {
    const html = flat(
      await render(
        inline(
          '<!DOCTYPE testsuite [<!-- a ] and > in a comment -->]><testsuite><testcase name="one"/></testsuite>',
        ),
      ),
    );
    expect(html).toContain('<span class="ctr-count" data-kind="passed">1 passed</span>');
  });

  it("adds up suite times when the root has none, and writes minutes", async () => {
    const html = await render(
      inline(
        '<testsuites><testsuite time="61"><testcase name="a"/></testsuite><testsuite time="20.4"><testcase name="b"/></testsuite></testsuites>',
      ),
    );
    expect(html).toContain('<span class="ctr-time">1 min 21 s</span>');
  });

  it("reads files through `read`, relative to `base`", async () => {
    const seen: string[] = [];
    const read = (path: string) => (seen.push(path), '<testsuite><testcase name="a"/></testsuite>');
    expect(
      await render('::tests{src="../junit.xml"}\n::', { read, base: "reports/unit" }),
    ).toContain("1 passed");
    expect(seen).toEqual(["reports/junit.xml"]);
  });

  it("reports malformed XML with its line, and a report that isn't JUnit", async () => {
    expect(await issues(inline('<testsuite>\n<testcase name="a">\n</testsuite>'))).toEqual([
      "`::tests` 1: its XML is malformed at line 3: `</testsuite>` closes `<testcase>`. Fix the report, or run the tests again to rewrite it.",
    ]);
    expect(await issues(inline("<testsuite><testcase name=a/></testsuite>"))).toEqual([
      "`::tests` 1: its XML is malformed at line 1: `<testcase` has an attribute that isn't `name=\"value\"`, or isn't closed with `>`. Fix the report, or run the tests again to rewrite it.",
    ]);
    expect(await issues(inline('<testsuite><testcase name="a & b"/></testsuite>'))).toEqual([
      "`::tests` 1: its XML is malformed at line 1: a bare `&` must be written `&amp;`. Fix the report, or run the tests again to rewrite it.",
    ]);
    expect(await issues(inline("<testsuite>"))).toEqual([
      "`::tests` 1: its XML is malformed at line 1: `<testsuite>` is never closed. Fix the report, or run the tests again to rewrite it.",
    ]);
    expect(await issues(inline("<coverage/>"))).toEqual([
      "`::tests` 1: it isn't a JUnit report: its root is `<coverage>`, not `<testsuites>` or `<testsuite>`.",
    ]);
    expect(await render(inline("<coverage/>"))).not.toContain("ctr");
  });

  it("reports a missing src, a missing file, a path outside the root, and a URL", async () => {
    expect(await issues("::tests\n::")).toEqual([
      '`::tests` 1: `src` is required. Write `::tests{src="junit.xml"}`, or put the report in an ```xml fence inside the block.',
    ]);
    expect(await issues('::tests{src="missing.xml"}\n::')).toEqual([
      '`::tests` 1 ("missing.xml"): file not found. It resolved to "missing.xml" under the root; check the path or `base`.',
    ]);
    expect(await issues('::tests{src="../../junit.xml"}\n::')).toEqual([
      '`::tests` 1 ("../../junit.xml"): the path leaves the root. Move the report under the root or widen `root`.',
    ]);
    expect(await issues('::tests{src="https://ci.test/junit.xml"}\n::')).toEqual([
      '`::tests` 1 ("https://ci.test/junit.xml"): `src` must be a local file; a report can\'t be read from a URL.',
    ]);
  });

  it("names each issue's rule, and reports a prop it doesn't read", async () => {
    const { meta } = await parseMarkdown(
      '::tests{src="junit.xml" titel="Pond"}\n::\n\n::tests{src="https://ci.test/junit.xml"}\n::\n\n' +
        inline("<coverage/>"),
      { plugins: [tests({ root })] },
    );
    expect(meta.issueRules).toEqual({
      "`::tests` 1 (\"junit.xml\"): `titel` isn't a prop of `::tests`, so it's ignored. Use `src` or `title`.":
        "comark/tests/unknown-prop",
      '`::tests` 2 ("https://ci.test/junit.xml"): `src` must be a local file; a report can\'t be read from a URL.':
        "comark/tests/remote-src",
      "`::tests` 3: it isn't a JUnit report: its root is `<coverage>`, not `<testsuites>` or `<testsuite>`.":
        "comark/tests/not-junit",
    });
  });
});
