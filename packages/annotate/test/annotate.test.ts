import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import security from "comark/plugins/security";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import annotate, { components } from "../src/html.ts";
import { draw } from "../src/marks.ts";
import { css } from "../src/styles.ts";

async function run(markdown: string) {
  const document = await parseMarkdown(markdown, { plugins: [annotate()] });
  return {
    issues: document.meta.issues,
    html: await renderHtmlFromDocument(document, { components }),
    document,
  };
}

const compare = `
::compare
:::screenshot{src="before.png" alt="Old toolbar" viewport="900x360"}
::::annotation{x=10 y=20 w=30 h=15}
Filters **wrap**.
::::
:::

:::screenshot{src="after.png" alt="New toolbar" href="https://pr2.example.com/plan" viewport="900x360"}
::::annotation{x=50 y=20 w=10 h=10 mark="check" color="#16a34a"}
One row.
::::
:::
::
`;

describe("comark-annotate", () => {
  it("renders a compare with numbered marks and linked notes", async () => {
    const { issues, html } = await run(compare);
    expect(issues).toEqual([]);
    expect(html).toContain('<img src="before.png" alt="Old toolbar"');
    expect(html).toContain('style="left:10%;top:20%;width:30%;height:15%"');
    expect(html).toMatch(
      /<span class="ca-mark ca-check" data-n="2" role="img" aria-label="Annotation 2: /,
    );
    expect(html).toMatch(/<li id="ca-[a-z0-9]+-1" data-n="1">.*Filters <strong>wrap<\/strong>\./);
    expect(html).toContain('<span class="ca-label">Before</span>');
    expect(html).toContain(
      '<span class="ca-label">After</span> <a href="https://pr2.example.com/plan" title="https://pr2.example.com/plan">pr2.example.com</a>',
    );
    expect(html).toMatch(
      /<figure class="ca-screenshot"><div class="ca-heading"><span class="ca-label">Before<\/span><\/div><div class="ca-stage" data-zoom tabindex="0" data-zoom-context=".ca,.ca-screenshot" data-zoom-aside="figcaption" data-zoom-title="Before">/,
    );
    expect(html).not.toMatch(/<figcaption><div class="ca-heading">/);
    // Side by side on a wide page, one at a time on a narrow one, and both zoom as one gallery.
    expect(html).toContain(
      '<div class="ca ca-compare" data-wide><div class="cc" data-carousel-columns="2" data-carousel-fits data-zoom-gallery',
    );
    expect(html).toMatch(/<div class="cc"[^>]* aria-label="Comparison"/);
    expect(html.match(/class="cc-slide"/g)).toHaveLength(2);
  });

  it("lays a slider's screenshots over each other, with a handle to drag and every note listed", async () => {
    const { issues, html } = await run(
      compare
        .replace("::compare", '::compare{mode="slider"}')
        .replace("x=10 y=20 w=30 h=15}", 'x=10 y=20 w=30 h=15 side="left"}'),
    );
    expect(issues).toEqual([]);
    expect(html).toContain(
      '<div class="ca ca-compare ca-slider" data-wide><div class="ca-swipe" data-zoom tabindex="0" data-zoom-context=".ca" data-zoom-aside=".ca-swipe-notes" data-zoom-title="Before / After"><div class="ca-side ca-side-before"><div class="ca-heading"><span class="ca-label">Before</span></div><div class="ca-stage"><div class="ca-frame"><img src="before.png"',
    );
    expect(html).toContain(
      '<div class="ca-side ca-side-after"><div class="ca-heading"><span class="ca-label">After</span> <a href="https://pr2.example.com/plan"',
    );
    expect(html).toContain(
      '<div class="ca-handle" role="slider" tabindex="0" aria-label="Divider between Before and After" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="Before 50%, After 50%">',
    );
    // A side note would point across the divider, so it joins the numbered list.
    expect(html).not.toContain('class="ca-callout');
    expect(html).not.toContain('class="ca-arrow');
    expect(html).toMatch(
      /<div class="ca-side-notes ca-notes-before">.*<span class="ca-stamp">1<\/span><div>Filters/,
    );
    expect(html).toMatch(
      /<div class="ca-side-notes ca-notes-after">.*<span class="ca-stamp">2<\/span><div>One row/,
    );
    expect(html).not.toContain('class="cc"');
  });

  it("carries the slider script once per render", async () => {
    const slider = compare.replace("::compare", '::compare{mode="slider"}');
    const { html } = await run(`${slider}\n${slider.replaceAll(".png", "-2.png")}`);
    expect(html.match(/<div class="ca-swipe"/g)).toHaveLength(2);
    expect(html.match(/<script>\(function start\(\) \{/g)).toHaveLength(1);
  });

  it("inlines the styles once per render and keeps ids stable and unique", async () => {
    const { document } = await run(
      `${compare}\n::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10}\nNote\n:::\n::\n\n::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10}\nAgain\n:::\n::`,
    );
    const first = await renderHtmlFromDocument(document, { components });
    const second = await renderHtmlFromDocument(document, { components });
    expect(first).toBe(second);
    expect(first.match(/<style>/g)).toHaveLength(1);
    const ids = [...first.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("styles only the notes themselves, so a list inside a note keeps its bullets", () => {
    expect(css).toContain(".ca-notes>li{display:flex");
    expect(css).not.toMatch(/\.ca-notes li\b/);
  });

  it("writes side notes and labels by hand, in a font inlined with the styles", async () => {
    const { html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 side="right"}\nNote\n:::\n::`,
    );
    expect(html).toContain(
      "@font-face{font-family:comark-caveat;src:url(data:font/woff2;base64,d09GMg",
    );
    expect(html).toMatch(/:where\(\.ca\)\{--ca-note-font:comark-caveat,cursive;/);
    expect(html).toMatch(/\.ca-callout\{[^}]*font-family:var\(--ca-note-font\);/);
    expect(html).toMatch(/\.ca-label\{[^}]*font-family:var\(--ca-note-font\);/);
  });

  const cleaned = async () => {
    const source = `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10}\nNote <img src="x" onerror="alert(1)"> <script>alert(2)</script>\n:::\n::`;
    const document = await parseMarkdown(source, {
      plugins: [annotate(), security({ blockedTags: ["script"] })],
    });
    return renderHtmlFromDocument(document, { components });
  };

  it("lets Comark's security plugin clean notes", async () => {
    const html = await cleaned();
    expect(html).toContain('<img src="x">');
    expect(html).not.toContain("onerror");
  });

  // Comark 0.8 moves inline HTML's text out of the element inside a block, so the blocked script's code is left as
  // escaped text: https://github.com/comarkdown/comark/issues/505. This starts passing, and so failing, once it's fixed.
  it.fails("removes a blocked script's code with it", async () => {
    expect(await cleaned()).not.toContain("alert(2)");
  });

  it("moves side notes beside the image with an arrow and keeps the rest in the list", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=10 h=10 side="right"}\nBeside\n:::\n:::annotation{x=50 y=50 w=10 h=10}\nListed\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html).toContain('class="ca-screenshot ca-right"');
    expect(html).toMatch(/class="ca-arrow ca-arrow-right" data-n="1" style="top:15%;left:20%;/);
    expect(html).toMatch(
      /class="ca-callout ca-callout-right" id="ca-[a-z0-9]+-1" data-n="1"[^>]*><span class="ca-stamp ca-letter">A<\/span><div>Beside/,
    );
    expect(html).toContain('aria-label="Side note: Beside"');
    expect(html).toContain(
      '<span class="ca-stamp" style="left:0;top:0;translate:-50% -50%">1</span></span>',
    );
    expect(html).toMatch(/<ol class="ca-notes"><li id="ca-[a-z0-9]+-2" data-n="2">.*Listed/);
  });

  it("puts each number on a corner of its mark, clear of the other numbers and marks", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=20 w=20 h=10}\nFirst\n:::\n:::annotation{x=10 y=26 w=20 h=10}\nJust under it\n:::\n:::annotation{x=0 y=60 w=10 h=10}\nAgainst the left edge\n:::\n::`,
    );
    expect(issues).toEqual([]);
    const stamps = [...html.matchAll(/<span class="ca-stamp" style="([^"]*)">(\d)<\/span>/g)];
    expect(stamps.map(([, css, number]) => [number, css])).toEqual([
      ["1", "left:0;top:0;translate:-50% -50%"],
      // The top left would touch number 1 and the top right would sit on mark 1, so it takes the bottom left.
      ["2", "left:0;bottom:0;translate:-50% 50%"],
      // Centered on the corner it would hang past the image, so it lines up with the mark's left edge.
      ["3", "left:-4px;top:0;translate:0 -50%"],
    ]);
  });

  it("draws every mark its own way, and the same way on every render", async () => {
    const source = `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=20 h=20}\nOne\n:::\n:::annotation{x=50 y=50 w=20 h=20}\nTwo\n:::\n:::annotation{x=10 y=60 w=20 h=5 mark="underline"}\nThree\n:::\n:::annotation{x=50 y=80 w=20 h=5 mark="underline"}\nFour\n:::\n::`;
    const { html } = await run(source);
    const drawn = [...html.matchAll(/<span class="ca-mark[^>]*><svg[^>]*>(.*?)<\/svg>/g)].map(
      ([, paths]) => paths,
    );
    expect(drawn).toHaveLength(4);
    expect(drawn[0]).not.toBe(drawn[1]);
    expect(drawn[2]).not.toBe(drawn[3]);
    expect((await run(source)).html).toBe(html);
  });

  it("keeps box clearance fixed and places its stamp on the padded corner", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=1 y=2 w=20 h=10 mark="box"}\nNear the corner.\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html).toContain('ca-stamp" style="left:3px;top:3px"');
    expect(css.match(/\.ca-mark\.ca-box\{[^}]+\}/)?.[0]).toBe(
      ".ca-mark.ca-box{box-sizing:content-box;padding:6px;margin:-6px}",
    );
    expect(css.includes("--ca-pad")).toBe(false);
  });

  it("reports numbers that overlap at every corner", async () => {
    const pile = Array.from(
      { length: 5 },
      (_, index) => `:::annotation{x=40 y=40 w=10 h=10}\nMark ${index + 1}\n:::\n`,
    ).join("");
    const { issues } = await run(`::screenshot{src="a.png" alt="A"}\n${pile}::`);
    expect(issues).toEqual([
      'screenshot "a.png": the numbers of annotations 1 and 5 overlap at every corner of their marks. Leave room between the marks, or merge them into one annotation.',
    ]);
  });

  it("keeps both images of a comparison level when only one has a note above it", async () => {
    const { html } = await run(
      `::compare\n:::screenshot{src="a.png" alt="A"}\n::::annotation{x=40 y=50 w=20 h=10 mark="none" side="top"}\nAbove.\n::::\n:::\n\n:::screenshot{src="b.png" alt="B"}\n:::\n::`,
    );
    expect(html.match(/class="ca-screenshot ca-top"/g)).toHaveLength(2);
  });

  it("lists the notes beside a compared screenshot under it and keeps the ones above", async () => {
    const { issues, html } = await run(
      `::compare\n:::screenshot{src="a.png" alt="A"}\n::::annotation{x=6 y=18 w=8 h=5 side="right"}\nFar from its note.\n::::\n::::annotation{x=6 y=22 w=8 h=5 side="right"}\nClose to the first.\n::::\n:::\n\n:::screenshot{src="b.png" alt="B"}\n::::annotation{x=40 y=50 w=20 h=10 mark="none" side="left"}\nPointed at.\n::::\n::::annotation{x=40 y=10 w=20 h=10 side="top"}\nAbove.\n::::\n:::\n::`,
    );
    // Listed notes can't overlap, so two close together aren't reported.
    expect(issues).toEqual([]);
    expect(html).not.toMatch(/class="ca-screenshot[^"]* ca-(left|right)/);
    expect(html).not.toMatch(/class="ca-(callout|arrow) ca-(callout|arrow)-(left|right)/);
    expect(html).toMatch(
      /<li id="ca-[a-z0-9]+-1" data-n="1"><span class="ca-stamp">1<\/span><div>Far/,
    );
    expect(html).toMatch(
      /<li id="ca-[a-z0-9]+-2" data-n="2"><span class="ca-stamp">2<\/span><div>Close/,
    );
    expect(html).toMatch(
      /<li id="ca-[a-z0-9]+-3" data-n="3"><span class="ca-stamp">3<\/span><div>Pointed/,
    );
    expect(html).toMatch(/class="ca-callout ca-callout-top" id="ca-[a-z0-9]+-4" data-n="4"/);
    expect(html.match(/class="ca-screenshot ca-top"/g)).toHaveLength(2);
  });

  it("gives every screenshot a Copy button that waits for the script", async () => {
    const { html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=10 h=10}\nNote\n:::\n::\n\n${compare}`,
    );
    expect(
      html.match(
        /<button type="button" class="ca-copy" aria-label="Copy the screenshot with its marks"/g,
      ),
    ).toHaveLength(3);
    // In the frame, after the marks, so it sits on the image's corner.
    expect(html).toMatch(
      /<div class="ca-frame"><img src="a.png"[^>]*><span class="ca-mark[^]*?<\/span><button type="button" class="ca-copy"[^]*?<\/button><span class="ca-copy-status" role="status"><\/span><\/div>/,
    );
    expect(html.match(/<script>\(function start\(\) \{/g)).toHaveLength(1);
    expect(css).toContain(".ca-copy{display:none}");
    expect(css).toContain("[data-annotate-copy] .ca-copy{");

    const slider = await run(compare.replace("::compare", '::compare{mode="slider"}'));
    expect(slider.html).not.toContain('class="ca-copy"');
  });

  it("points from a note above the image without drawing a mark", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=40 y=50 w=20 h=10 mark="none" side="top"}\nStart with what failed.\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html).toContain('class="ca-screenshot ca-top"');
    expect(html).toMatch(
      /class="ca-arrow ca-arrow-top ca-reach" data-n="1" style="left:50%;top:calc\(-1 \* var\(--ca-gap\)\);bottom:50%"/,
    );
    expect(html).toContain('class="ca-mark ca-none"');
    expect(html).not.toMatch(/ca-mark ca-none"[^>]*><svg[^>]*><path/);
    expect(html).toContain('title="Start with what failed."');
  });

  it("points from a note below the image, and keeps a compare level when one side has one", async () => {
    const { issues, html } = await run(
      `::compare\n:::screenshot{src="a.png" alt="A"}\n::::annotation{x=40 y=50 w=20 h=10 mark="underline" side="bottom"}\nBelow.\n::::\n:::\n\n:::screenshot{src="b.png" alt="B"}\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html.match(/class="ca-screenshot ca-bottom"/g)).toHaveLength(2);
    expect(html).toMatch(
      /class="ca-arrow ca-arrow-bottom" data-n="1" style="left:50%;top:60%;bottom:calc\(-1 \* var\(--ca-gap\)\)"/,
    );
    expect(html).toMatch(/class="ca-callout ca-callout-bottom" id="ca-[a-z0-9]+-1"/);
    expect(css).toContain(".ca-bottom .ca-stage{--ca-pb:var(--ca-bottom-gutter)");
  });

  it("sets a note off to one side with `at` and sweeps its arrow into the `to` point", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=20 w=10 h=5 mark="none" side="top" at=40 to="12,21"}\nThe type gets the headline.\n:::\n:::annotation{x=60 y=70 w=10 h=5 side="bottom" at=30}\nOpen it here.\n:::\n:::annotation{x=10 y=40 w=10 h=10 mark="bracket" side="right" at=20}\nThree rows.\n:::\n::`,
    );
    expect(issues).toEqual([]);
    // The point lies left of the note, so the note reads rightward from where its leader leaves it.
    expect(html).toMatch(
      /class="ca-arrow ca-arrow-top ca-curve ca-reach" data-n="1" style="left:12%;right:60%;top:calc\(-1 \* var\(--ca-lead\)\);bottom:79%"[^>]*><svg class="ca-arrow-line" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M100 0C55 0 0 20 0 100"/,
    );
    expect(html).toMatch(
      /class="ca-callout ca-callout-top ca-callout-east" id="ca-[a-z0-9]+-1" data-n="1" style="left:calc\(var\(--ca-pl,0px\) \+ \(100% - var\(--ca-pl,0px\) - var\(--ca-pr,0px\)\) \* 0.4\)"/,
    );
    // Without `to`, the arrow meets the edge of the mark that faces the note; this one lies right of its note.
    expect(html).toMatch(
      /class="ca-arrow ca-arrow-bottom ca-curve" data-n="2" style="left:30%;right:35%;top:75%;bottom:calc\(-1 \* var\(--ca-lead\)\)"[^>]*>.*?<path d="M0 100C45 100 100 80 100 0"/,
    );
    expect(html).toMatch(/class="ca-callout ca-callout-bottom ca-callout-west"/);
    // A right note above its point drops into it and lands level.
    expect(html).toMatch(
      /class="ca-arrow ca-arrow-right ca-curve" data-n="3" style="top:20%;bottom:55%;left:20%;right:calc\(-1 \* var\(--ca-gap\)\)"[^>]*>.*?<path d="M100 0C40 0 60 100 0 100"/,
    );
    expect(html).toMatch(
      /class="ca-callout ca-callout-right" id="ca-[a-z0-9]+-3" data-n="3" style="top:calc\(var\(--ca-pt,0px\) \+ \(100% - var\(--ca-pt,0px\) - var\(--ca-pb,0px\)\) \* 0.2\)"/,
    );
  });

  it("runs the arrow straight when the note sits level with its point", async () => {
    const { html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=40 y=50 w=20 h=10 side="top" at=51}\nAbove.\n:::\n::`,
    );
    expect(html).toContain('class="ca-arrow ca-arrow-top" data-n="1" style="left:50%;');
    expect(html).toMatch(/class="ca-callout ca-callout-top" id=/);
  });

  it("draws a bracket on the edge that faces its note", async () => {
    const shot = (side: string) =>
      run(
        `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=20 h=40 mark="bracket"${side ? ` side="${side}"` : ""}}\nRows.\n:::\n::`,
      ).then(
        ({ html }) =>
          /ca-mark ca-bracket"[^>]*><svg viewBox="[^"]+"[^>]*><path d="M([\d.-]+) /.exec(html)![1],
      );
    // The reference width is 420px, so this box is 84px wide: a left bracket starts near 0, a right one near 84.
    expect(Number(await shot(""))).toBeLessThan(10);
    expect(Number(await shot("left"))).toBeLessThan(10);
    expect(Number(await shot("right"))).toBeGreaterThan(70);
  });

  it("draws a line along the longer side of its box, through the middle", async () => {
    const shot = (w: number, h: number) =>
      run(
        `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=${w} h=${h} mark="line"}\nThe fold.\n:::\n::`,
      ).then(({ issues, html }) => {
        expect(issues).toEqual([]);
        const [, x, y] = /ca-mark ca-line"[^>]*><svg [^>]*><path d="M([\d.-]+) ([\d.-]+)Q/.exec(
          html,
        )!;
        return [Number(x), Number(y)];
      });
    // The reference width is 420px: an 80% wide box is 336px across, and a 4% high one about 10px down.
    const [x, y] = await shot(80, 4);
    expect(Math.abs(x!)).toBeLessThan(2);
    expect(Math.abs(y! - 5.25)).toBeLessThan(2);
    const [down, along] = await shot(2, 80);
    expect(Math.abs(down! - 4.2)).toBeLessThan(2);
    expect(Math.abs(along!)).toBeLessThan(2);
  });

  it("colors every mark without its own color in the figure's `ink`", async () => {
    const { issues, html } = await run(
      `::compare{ink="violet"}\n:::screenshot{src="a.png" alt="A"}\n::::annotation{x=10 y=10 w=10 h=10}\nInked.\n::::\n::::annotation{x=40 y=10 w=10 h=10 color="red"}\nOwn color.\n::::\n:::\n\n:::screenshot{src="b.png" alt="B" ink="#16a34a"}\n::::annotation{x=10 y=10 w=10 h=10}\nOwn ink.\n::::\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html).toMatch(/data-n="1"[^>]*style="--ca-color:var\(--ca-violet\);/);
    expect(html).toMatch(/data-n="2"[^>]*style="--ca-color:var\(--ca-red\);/);
    expect(html).toMatch(/data-n="3"[^>]*style="--ca-color:#16a34a;/);
    expect(css).toContain("--ca-violet:#8b5cf6");
    // Violet is also the default, so marks without a color or an ink take it.
    expect(css).toContain("--ca-color:var(--ca-violet);--ca-solid:var(--ca-violet-solid)");
  });

  it("reports `at` and `to` without a side, out of range, or written wrong, and a bad ink", async () => {
    const { issues, document } = await run(
      `::screenshot{src="a.png" alt="A" ink="purple"}\n:::annotation{x=10 y=10 w=10 h=10 at=40}\nNo side.\n:::\n:::annotation{x=10 y=40 w=10 h=10 side="top" at=140 to="12"}\nOut.\n:::\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png": `ink` must be red, amber, green, blue, violet, gray, or a 3- or 6-digit hex color like #8b5cf6 (got "purple").',
      'screenshot "a.png", annotation 1: `at` places a side note and its arrow, so it needs a `side`. Add `side="top"`, `"bottom"`, `"left"`, or `"right"`.',
      'screenshot "a.png", annotation 2 (top note): `at` must be where the note sits along its margin, a percentage of the image from 0 to 100 (got "140").',
      'screenshot "a.png", annotation 2 (top note): `to` must be the point the arrow lands on, as two percentages of the image from 0 to 100, like to="42,18" (got "12").',
    ]);
    expect(Object.values(document.meta.issueRules)).toEqual([
      "comark/annotate/invalid-color",
      "comark/annotate/needs-side",
      "comark/annotate/invalid-position",
      "comark/annotate/invalid-position",
    ]);
  });

  it("checks for crowded notes where they sit, at their `at`", async () => {
    const { issues } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=10 w=10 h=10 side="top" at=50}\nOne.\n:::\n:::annotation{x=70 y=10 w=10 h=10 side="top" at=60}\nTwo.\n:::\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png": the top notes for annotations 1 and 2 would overlap. Move one along with `at`, to another side, or under the image.',
    ]);
  });

  it("maps named colors to the palette and passes hex through", async () => {
    const { html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 color="amber"}\nA\n:::\n:::annotation{x=50 y=50 w=10 h=10 color="#123456"}\nB\n:::\n::`,
    );
    expect(html).toContain(
      "--ca-color:var(--ca-amber);--ca-solid:var(--ca-amber-solid);--ca-ink:var(--ca-amber-ink);",
    );
    expect(html).toContain("--ca-color:#123456;--ca-solid:#123456;--ca-ink:#fff;");
  });

  it("reads props from YAML blocks and bindings", async () => {
    const { issues, html } = await run(
      '::screenshot{src="a.png" alt="A"}\n:::annotation\n```yaml [props]\nx: 10\ny: 20\nw: 30\nh: 15\nside: right\n```\nFrom YAML\n:::\n:::annotation{:x="40" :y="40" :w="10" :h="10"}\nBound\n:::\n::',
    );
    expect(issues).toEqual([]);
    expect(html).toContain("left:10%;top:20%;width:30%;height:15%");
    expect(html).toContain("left:40%;top:40%;width:10%;height:10%");
    expect(html).toContain("ca-callout-right");
  });

  it("leaves props bound to render-time data to the renderer", async () => {
    const markdown = `::screenshot{src="a.png" alt="A"}\n:::annotation{:x="data.box.x" :y="data.box.y" w=10 h=10}\nNote\n:::\n::`;
    const document = await parseMarkdown(markdown, { plugins: [annotate()] });
    expect(document.meta.issues).toEqual([]);
    const html = await renderHtmlFromDocument(document, {
      components,
      data: { box: { x: 30, y: 40 } },
    });
    expect(html).toContain("left:30%;top:40%;width:10%;height:10%");
  });

  it("does not throw when bound position and ink values are revoked proxies", async () => {
    const document = await parseMarkdown(
      `::screenshot{src="a.png" alt="A" :ink="data.value"}\n:::annotation{x=10 y=10 w=10 h=10 side="top" :at="data.value" :to="data.value"}\nNote\n:::\n::`,
      { plugins: [annotate()] },
    );
    const value = Proxy.revocable({}, {}).proxy;
    // Revoke after the binding is set up so each reader sees the same hostile object.
    const revoked = Proxy.revocable(value, {});
    revoked.revoke();
    await expect(
      renderHtmlFromDocument(document, { components, data: { value: revoked.proxy } }),
    ).resolves.toContain("a.png");
  });

  it("reports inherited object keys as marks instead of crashing", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=1 y=1 w=10 h=10 mark="toString"}\nNote\n:::\n::`,
    );
    expect(issues.join("\n")).toContain("`mark` must be one of");
    expect(html).toContain("ca-mark ca-box");
  });

  it.each([
    [`::screenshot{src="a.png"}\n::`, "`alt` is required"],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=95 y=0 w=10 h=10}\nNote\n:::\n::`,
      "runs past the image edge",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10}\nNote\n:::\n::`,
      "annotation 1: `h` is required",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 mark="star"}\nNote\n:::\n::`,
      "`mark` must be one of",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10}\n:::\n::`,
      "write a note",
    ],
    [
      `::screenshot{src="a.png" alt="A" href="javascript:alert(1)"}\n::`,
      "`href` must be an http:// or https:// URL",
    ],
    [`::compare\n:::screenshot{src="a.png" alt="A"}\n:::\n::`, "needs exactly two screenshots"],
    [
      compare.replace('viewport="900x360"', 'viewport="1440x900"'),
      'compare 1: screenshot "before.png" was captured at 1440x900 and screenshot "after.png" at 900x360, so they can\'t be compared. Recapture both at the same viewport.',
    ],
    [
      `::annotation{x=0 y=0 w=10 h=10}\nStray note\n::`,
      'annotation 1 outside a screenshot ("Stray note"): it has nothing to point at.',
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n> :::annotation{x=0 y=0 w=10 h=10}\n> Note\n> :::\n::`,
      "Annotations must be direct children of a screenshot",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10}\n<!-- todo -->\n:::\n::`,
      "write a note",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 color="gren"}\nNote\n:::\n::`,
      "`color` must be",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 side="up"}\nNote\n:::\n::`,
      "`side` must be left, right, top, or bottom",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=10 w=10 h=10 side="left"}\nA\n:::\n:::annotation{x=0 y=15 w=10 h=10 side="left"}\nB\n:::\n::`,
      "would overlap",
    ],
    [
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=10 y=50 w=10 h=10 side="top"}\nA\n:::\n:::annotation{x=20 y=50 w=10 h=10 side="top"}\nB\n:::\n::`,
      "top notes for annotations 1 and 2 would overlap",
    ],
    [
      compare.replace("::compare", '::compare{mode="swipe"}'),
      'compare 1: `mode` is "swipe", which isn\'t a compare mode. Use `columns` (side by side, the default) or `slider`.',
    ],
  ])("reports %#: %s", async (markdown, issue) => {
    const { issues } = await run(markdown);
    expect(issues.join("\n")).toContain(issue);
  });

  it("escapes attributes and drops unsafe links", async () => {
    const { html } = await run(
      `::screenshot{src='a.png" onerror="x' alt="<b>" href="javascript:alert(1)"}\n::`,
    );
    expect(html).toContain('src="a.png&quot; onerror=&quot;x"');
    expect(html).toContain('alt="&lt;b&gt;"');
    expect(html).not.toContain("javascript:");
    const { html: lookalike } = await run(
      `::screenshot{src="a.png" alt="A" href="httpx:alert(1)"}\n::`,
    );
    expect(lookalike).not.toContain("<a href");
    const { issues, html: upper } = await run(
      `::screenshot{src="a.png" alt="A" href="HTTPS://x.com"}\n::`,
    );
    expect(issues).toEqual([]);
    expect(upper).toContain('<a href="HTTPS://x.com" title="HTTPS://x.com">x.com</a>');
  });

  it("checks and renders files from the CLI", async () => {
    const dir = await mkdtemp(join(tmpdir(), "comark-annotate-"));
    const cli = (...args: string[]) =>
      promisify(execFile)(process.execPath, [
        new URL("../dist/cli.mjs", import.meta.url).pathname,
        ...args,
      ]);
    await writeFile(
      join(dir, "ok.md"),
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=1 y=1 w=5 h=5}\nNote\n:::\n::`,
    );
    await writeFile(join(dir, "bad.md"), `::screenshot{src="a.png"}\n::`);
    expect((await cli("check", join(dir, "ok.md"))).stdout).toContain("No problems.");
    await expect(cli("check", join(dir, "bad.md"))).rejects.toMatchObject({ code: 1 });
    await cli("render", join(dir, "ok.md"));
    expect(await readFile(join(dir, "ok.html"), "utf8")).toContain(
      '<span class="ca-stamp" style="left:3px;top:3px">1</span>',
    );

    // Every file is checked, and each issue says which file it's in.
    const both = cli("check", join(dir, "ok.md"), join(dir, "bad.md"));
    await expect(both).rejects.toMatchObject({
      code: 1,
      stderr: `${join(dir, "bad.md")}: screenshot "a.png": \`alt\` is required. Describe what the screenshot shows.\n`,
    });
    await expect(cli("check", join(dir, "missing.md"))).rejects.toMatchObject({
      code: 2,
      stderr: `comark-annotate: can't read ${join(dir, "missing.md")}\n`,
    });
    await expect(
      cli("render", join(dir, "ok.md"), "-o", join(dir, "nowhere", "ok.html")),
    ).rejects.toMatchObject({
      code: 2,
      stderr: `comark-annotate: can't write ${join(dir, "nowhere", "ok.html")}\n`,
    });

    await writeFile(
      join(dir, "mixed.md"),
      `::carousel\n![One](a.png)\n\n![Two](b.png)\n::\n\n::zoom\nA block\n::`,
    );
    await cli("render", join(dir, "mixed.md"));
    const mixed = await readFile(join(dir, "mixed.html"), "utf8");
    expect(mixed.match(/class="cc-slide"/g)).toHaveLength(2);
    expect(mixed).toContain('<div class="cz" data-zoom');
  });

  it("names each annotation by its place in its own screenshot", async () => {
    const { issues } = await run(compare.replace("x=50 y=20", "x=95 y=20"));
    expect(issues).toEqual([
      'screenshot "after.png", annotation 1 (stamp 2): the box runs past the image edge. Keep x + w and y + h within 100.',
    ]);
    const { issues: side } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=1 y=1 w=5 h=5}\nOne\n:::\n:::annotation{x=1 y=1 w=5 h=5 side="left"}\n:::\n::`,
    );
    expect(side).toEqual([
      'screenshot "a.png", annotation 2 (left note): write a note explaining what the mark points at.',
    ]);
  });

  it("tells screenshots apart when their src is missing or shared", async () => {
    const { issues } = await run(
      `::screenshot{alt="Dashboard before"}\n::\n\n::screenshot{alt="Dashboard after"}\n::\n\n::screenshot{src="a.png"}\n::\n\n::screenshot{src="a.png" alt="Again" href="ftp://x"}\n::`,
    );
    expect(issues).toEqual([
      'screenshot 1 ("Dashboard before"): `src` is required. Point it at the image file.',
      'screenshot 2 ("Dashboard after"): `src` is required. Point it at the image file.',
      "screenshot 3: `alt` is required. Describe what the screenshot shows.",
      'screenshot 4 ("Again"): `href` must be an http:// or https:// URL with a host. Link the page you captured.',
    ]);
  });

  it("names the compare in its messages and says how to fix them", async () => {
    const { issues } = await run(
      `::compare{title="Toolbar"}\n:::screenshot{src="a.png" alt="A"}\n:::\nStray text\n::`,
    );
    expect(issues).toEqual([
      'compare 1 ("Toolbar"): only `screenshot` blocks can go inside a compare (found text). Move it before or after the compare.',
      'compare 1 ("Toolbar"): needs exactly two screenshots, before and after (got 1). Add the missing one.',
    ]);
  });

  it("reports bindings that point at missing frontmatter, and reads the ones that resolve", async () => {
    const { issues, html } = await run(
      `---\npos:\n  x: 30\n---\n::screenshot{src="a.png" alt="A"}\n:::annotation{:x="frontmatter.pos.x" :y="frontmatter.pos.yy" w=10 h=10}\nNote\n:::\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png", annotation 1: `:y` points at frontmatter.pos.yy, which is undefined. Fix the path or set `y` directly.',
    ]);
    expect(html).toContain("left:30%;");
  });

  it('reports mark="none" without a side note, since nothing would point at the spot', async () => {
    const { issues } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=1 y=1 w=5 h=5 mark="none"}\nNote\n:::\n::`,
    );
    expect(issues.join("\n")).toContain(
      'annotation 1: `mark="none"` draws nothing, so without a `side` note nothing points at the spot.',
    );
  });

  it("reports unknown props with the valid ones and a likely fix", async () => {
    const { issues } = await run(
      `::compare{label="Toolbar"}\n:::screenshot{src="a.png" alt="A" label="Before" url="https://x.com" caption="Hi"}\n::::annotation{x=1 y=1 width=5 h=5 sid="left" colour="red"}\nNote\n::::\n:::\n\n:::screenshot{src="b.png" alt="B"}\n:::\n::`,
    );
    expect(issues).toEqual([
      "compare 1: `label` isn't a prop of `::compare`. Did you mean `title`? Valid props: title, mode, ink.",
      'screenshot "a.png": `label` isn\'t a prop of `::screenshot`. Did you mean `title`? Valid props: src, alt, title, href, viewport, ink.',
      'screenshot "a.png": `url` isn\'t a prop of `::screenshot`. Did you mean `href`? Valid props: src, alt, title, href, viewport, ink.',
      'screenshot "a.png": `caption` isn\'t a prop of `::screenshot`. Write the caption as Markdown inside the block, after the annotations. Valid props: src, alt, title, href, viewport, ink.',
      'screenshot "a.png", annotation 1: `width` isn\'t a prop of `::annotation`. Did you mean `w`? Valid props: x, y, w, h, mark, color, side, at, to.',
      'screenshot "a.png", annotation 1: `sid` isn\'t a prop of `::annotation`. Did you mean `side`? Valid props: x, y, w, h, mark, color, side, at, to.',
      'screenshot "a.png", annotation 1: `colour` isn\'t a prop of `::annotation`. Did you mean `color`? Valid props: x, y, w, h, mark, color, side, at, to.',
      'screenshot "a.png", annotation 1: `w` is required: a percentage of the image, a number without %, above 0 and up to 100.',
    ]);
  });

  it("accepts only plain decimal coordinates", async () => {
    const { issues } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x="10%" y=0x10 w=.5 h=12.5}\nNote\n:::\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png", annotation 1: `x` must be a percentage of the image, a number without %, from 0 to 100 (got "10%").',
      'screenshot "a.png", annotation 1: `y` must be a percentage of the image, a number without %, from 0 to 100 (got "0x10").',
    ]);
  });

  it("gives a light hex color a dark number, and rejects hex with alpha", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A"}\n:::annotation{x=0 y=0 w=10 h=10 color="#fde047"}\nA\n:::\n:::annotation{x=50 y=50 w=10 h=10 color="#e11d4800"}\nB\n:::\n:::annotation{x=80 y=80 w=10 h=10 color="#FF0"}\nC\n:::\n::`,
    );
    expect(html).toContain("--ca-color:#fde047;--ca-solid:#fde047;--ca-ink:#1c1917;");
    expect(html).toContain("--ca-color:#FF0;--ca-solid:#FF0;--ca-ink:#1c1917;");
    expect(issues).toEqual([
      'screenshot "a.png", annotation 2: `color` must be red, amber, green, blue, violet, gray, or a 3- or 6-digit hex color like #e5484d (got "#e11d4800").',
    ]);
  });

  it("titles a screenshot and a comparison", async () => {
    const { issues, html } = await run(
      `::compare{title="Toolbar fix"}\n:::screenshot{src="a.png" alt="A" title="Main"}\n:::\n\n:::screenshot{src="b.png" alt="B"}\n:::\n::`,
    );
    expect(issues).toEqual([]);
    expect(html).toMatch(/<div class="cc"[^>]* aria-label="Toolbar fix"/);
    expect(html).toContain('<div class="ca-heading"><span class="ca-label">Main</span>');
    expect(html).toContain('data-zoom-title="Main"><div class="ca-frame">');
    expect(html).toContain('<span class="ca-label">After</span>');
  });

  it("compares viewports by size, however they're written", async () => {
    const same = compare.replace('viewport="900x360"', 'viewport="900 × 360"');
    expect((await run(same)).issues).toEqual([]);
    const padded = compare.replace('viewport="900x360"', 'viewport="0900x0360"');
    expect((await run(padded)).issues).toEqual([]);
    const { issues } = await run(compare.replace('viewport="900x360"', 'viewport="wide"'));
    expect(issues).toEqual([
      'screenshot "before.png": `viewport` must be the capture size in pixels, like 1440x900 (got "wide").',
    ]);
  });

  it("leaves Comark's own attributes alone", async () => {
    const { issues } = await run(
      `::screenshot{src="a.png" alt="A" #hero .wide style="margin:0" data-testid="shot" aria-describedby="d" :class="data.cls" :data-x="data.x"}\n:::annotation{x=1 y=1 w=5 h=5 .pulse data-step="1"}\nNote\n:::\n::`,
    );
    expect(issues).toEqual([]);
  });

  it("reports a link without a host, and an unsafe bound link, and leaves both out", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A" href="https://?x"}\n::\n\n::screenshot{src="b.png" alt="B" :href='"javascript:alert(1)"'}\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png": `href` must be an http:// or https:// URL with a host. Link the page you captured.',
      'screenshot "b.png": `:href` resolves to an unsafe URL, so it\'s left out. Use an http:// or https:// URL.',
    ]);
    expect(html).not.toContain("<a href");
    expect(html).not.toContain("javascript:");
  });

  it("reports an unsafe bound link even next to a plain one", async () => {
    const { issues, html } = await run(
      `::screenshot{src="a.png" alt="A" href="https://safe.example" :href='"javascript:alert(1)"'}\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png": `:href` resolves to an unsafe URL, so it\'s left out. Use an http:// or https:// URL.',
    ]);
    expect(html).not.toContain("javascript:");
  });

  it("reports props named like Object's own keys without leaking them into the hint", async () => {
    const { issues } = await run(
      `::screenshot{src="a.png" alt="A" constructor="x" :__proto__="y"}\n::`,
    );
    expect(issues).toEqual([
      'screenshot "a.png": `constructor` isn\'t a prop of `::screenshot`. Valid props: src, alt, title, href, viewport, ink.',
      'screenshot "a.png": `__proto__` isn\'t a prop of `::screenshot`. Valid props: src, alt, title, href, viewport, ink.',
    ]);
  });

  it("quotes names taken from the document", async () => {
    const { issues } = await run(`::screenshot{src='a"b.png'}\n::`);
    expect(issues).toEqual([
      'screenshot "a\\"b.png": `alt` is required. Describe what the screenshot shows.',
    ]);
  });

  it("names each issue's rule for the linter", async () => {
    const { document } = await run(
      `::compare
:::screenshot{src="a.png" alt="A" colour="red"}
::::annotation{x=0.2 y=0.3 w=0.15 h=0.1}
Duck
::::
:::
:::screenshot{src="a.png" alt="B"}
:::
::`,
    );
    expect(document.meta.issues).toEqual([
      'screenshot 1 ("A"): `colour` isn\'t a prop of `::screenshot`. Valid props: src, alt, title, href, viewport, ink.',
      'screenshot 1 ("A"), annotation 1: `x`, `y`, `w`, and `h` are all 1 or less, so the box is a speck in the top left corner. They\'re percentages: multiply each by 100, so x=0.25 becomes x=25.',
      'compare 1: both screenshots show "a.png", so there\'s no change to see. Point the after screenshot at the new capture.',
    ]);
    expect(Object.values(document.meta.issueRules)).toEqual([
      "comark/annotate/unknown-prop",
      "comark/annotate/box-as-fraction",
      "comark/annotate/compare-same-image",
    ]);
  });

  it("loops a circle around its whole area, and only a little past a long one's ends", () => {
    // The points the loop passes through, from its path's curve ends.
    const loop = (width: number, height: number) =>
      [
        ...draw("circle", width, height, 7).paths[0]!.matchAll(
          /(?:^M| )(-?[\d.]+) (-?[\d.]+)(?=C|$)/g,
        ),
      ].map(([, x, y]) => [Number(x), Number(y)] as const);
    // Even-odd ray casting: a point inside the loop crosses its outline an odd number of times.
    const inside = (points: (readonly [number, number])[], [x, y]: readonly [number, number]) =>
      points.reduce((odd, [x1, y1], index) => {
        const [x2, y2] = points[(index + 1) % points.length]!;
        return y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1 ? !odd : odd;
      }, false);
    for (const [width, height] of [
      [40, 40],
      [120, 30],
      [400, 40],
      [24, 300],
    ] as const) {
      const points = loop(width, height);
      for (const corner of [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ] as const)
        expect(inside(points, corner), `${width}x${height} at ${corner.join(",")}`).toBe(true);
      const [long, from, to] =
        width >= height
          ? [width, Math.min(...points.map(([x]) => x)), Math.max(...points.map(([x]) => x))]
          : [height, Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([, y]) => y))];
      expect(to - from - long, `${width}x${height}`).toBeLessThan(Math.max(40, long * 0.2));
    }
  });
});

describe("screenshot sizes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x0b,
    0x40, 0, 0, 0x07, 0x08, 8, 6, 0, 0, 0,
  ]);

  it("keeps an image's room before it loads: its viewport, or the size read from the file", async () => {
    const fetch = vi.fn(async () => new Response(png));
    vi.stubGlobal("fetch", fetch);
    const shot = (attrs: string) => run(`::screenshot{${attrs} alt="Toolbar"}\n::`);
    expect((await shot('src="a.png" viewport="1440x900"')).html).toContain(
      '<img src="a.png" alt="Toolbar" width="1440" height="900" loading="lazy"',
    );
    expect((await shot('src="https://cdn.test/shot.png"')).html).toContain(
      'alt="Toolbar" width="2880" height="1800" loading="lazy"',
    );
    expect((await shot('src="b.png"')).html).toContain(
      '<img src="b.png" alt="Toolbar" loading="lazy"',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
