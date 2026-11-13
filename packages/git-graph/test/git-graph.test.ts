import { readFileSync } from "node:fs";
import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import gitGraph, { components } from "../src/html.ts";

// Real transcripts, recorded from scratch repositories with LC_ALL=C: test/fixtures/README.md says how.
const fixture = (name: string) =>
  readFileSync(new URL(`fixtures/${name}.txt`, import.meta.url), "utf8").trimEnd();
const block = (source: string, props = "") => `::git-graph${props}\n\`\`\`\n${source}\n\`\`\`\n::`;
const render = (markdown: string) =>
  createHtmlRenderer({ plugins: [gitGraph()], components })(markdown);
const parse = (markdown: string) => parseMarkdown(markdown, { plugins: [gitGraph()] });
const flat = (html: string) => html.replace(/\s*\n\s*/g, "");
const rows = (html: string) =>
  [...html.matchAll(/<div class="cgg-row"[^>]*>(.*?)<span class="cgg-sha">(\w*)<\/span>/g)].map(
    (m) => m[2],
  );

describe("comark-git-graph", () => {
  it("draws git log --graph --oneline --decorate --parents newest first, with branch pills at their tips", async () => {
    const html = flat(await render(block(fixture("history"), '{title="How 1.5 shipped"}')));
    expect(html).toContain(
      '<figure class="cgg" data-comark-frame data-not-typeset aria-label="How 1.5 shipped"><div class="cgg-head"><span class="cgg-title">How 1.5 shipped</span><span class="cgg-count">5 branches · 20 commits</span></div>',
    );
    expect(rows(html)[0]).toBe("734e0a0");
    expect(rows(html).at(-1)).toBe("27a1a3e");
    expect(html).toContain(
      '<span class="cgg-subject"><span class="cgg-ref">#97</span> Merge fix/footer</span><span class="cgg-branch" data-lane="0" title="main">main</span>',
    );
    expect(html).toContain(
      '<span class="cgg-branch" data-lane="1" title="release/1.5">release/1.5</span><span class="cgg-tag">v1.5.0</span>',
    );
    expect(html).toContain('<span class="cgg-tag">v1.4.0</span>');
    expect(html.match(/<style data-comark-git-graph>/g)).toHaveLength(1);
  });

  it("names a merged and deleted branch from its merge message, and draws merges both ways", async () => {
    const html = flat(await render(block(fixture("history"))));
    expect(html).toContain(
      '<span class="cgg-branch" data-lane="3" data-deleted="" title="feat/search, merged and deleted">feat/search</span><span class="cgg-muted">#90</span>',
    );
    expect(html).toContain(
      'title="fix/footer, merged and deleted">fix/footer</span><span class="cgg-muted">#97</span>',
    );
    // Main merged into feat/search, then feat/search into main, then fix/footer into main.
    expect(html.match(/class="cgg-merge /g)).toHaveLength(3);
  });

  it("marks a commit that git cherry says another branch has", async () => {
    const html = flat(await render(block(fixture("history"))));
    expect(html).toContain('<circle class="cgg-has"');
    expect(html).toContain(
      "<title>Fix the RC&#39;s broken migration → main: already there</title>".replace(
        "&#39;",
        "'",
      ),
    );
    expect(html).toContain('<span class="cgg-sr">main: already there.</span>');
  });

  it("keeps the newest commits with max-count, like git log -n, and folds the rest into one row", async () => {
    const html = flat(await render(block(fixture("history"), "{max-count=14}")));
    expect(rows(html)).toHaveLength(14);
    expect(html).toContain('<span class="cgg-subject cgg-muted">6 more commits</span>');
    expect(html).toContain('<span class="cgg-key" data-status="elided">Commits left out</span>');
  });

  it("splits a stack into one lane per branch, in one column", async () => {
    const html = flat(await render(block(fixture("stack"))));
    expect(html).toContain('<span class="cgg-count">4 branches · 6 commits</span>');
    for (const name of ["stack/session-api", "stack/sign-in-form", "stack/sign-in-docs"])
      expect(html).toContain(`title="${name}">${name}</span>`);
    // Two columns: the trunk's and the stack's.
    expect(html).toContain('<svg viewBox="0 0 46 ');
  });

  it("reads a backport's git cherry and cherry-pick dry run into numbered picks, oldest first with reverse", async () => {
    const html = flat(await render(block(fixture("backport"), "{reverse}")));
    expect(rows(html)[0]).toBe("5de6be0");
    expect(html).toContain('<span class="cgg-count">4 branches · 11 picks</span>');
    // release/2.4's own copies of the first two fixes fold into main's rows.
    expect(html.match(/Alert links keep their filters/g)).toHaveLength(2);
    expect(html).toContain(
      '<span class="cgg-note" data-status="conflict" title="release/2.2: conflict, src/settings.ts"><b>2.2</b> conflict · src/settings.ts</span><span class="cgg-note" data-status="conflict" title="release/2.4: conflict, src/Table.vue"><b>2.4</b> conflict · src/Table.vue</span>',
    );
    expect(html).toContain('<g class="cgg-pick" data-status="clean"><circle cx="');
    expect(html).toContain(
      '<span class="cgg-key" data-status="clean">Applies clean</span><span class="cgg-key" data-status="conflict">Conflict</span><span class="cgg-key" data-status="has">Already there</span>',
    );
  });

  it("reads git's long format and a conflict printed in another language", async () => {
    const log = [
      "$ git log --graph --decorate --parents --all",
      "* commit 2222222aaaa 1111111bbbb (HEAD -> main)",
      "| Author: Ada <ada@example.com>",
      "| Date:   Mon Jan 5 09:00:00 2026 +0000",
      "|",
      "|     Quiet expected 4xx errors (#818)",
      "|",
      "| * commit 3333333cccc 1111111bbbb (release/2.2)",
      "|/  Author: Ada <ada@example.com>",
      "|",
      "|       Retry the webhook",
      "|",
      "* commit 1111111bbbb (tag: v2.2.14)",
      "  Author: Ada <ada@example.com>",
      "",
      "      Release 2.2.14",
      "$ git switch release/2.2",
      "$ git cherry-pick 2222222",
      "Auto-fusionando src/errors.ts",
      "CONFLICTO (contenido): Conflicto de fusión en src/errors.ts",
      "error: no se pudo aplicar 2222222... Quiet expected 4xx errors (#818)",
    ].join("\n");
    const html = flat(await render(block(log)));
    expect(html).toContain(
      '<span class="cgg-subject"><span class="cgg-ref">#818</span> Quiet expected 4xx errors</span>',
    );
    expect(html).toContain("<b>2.2</b> conflict · src/errors.ts</span>");
    expect(html).toContain("Retry the webhook");
  });

  it("takes a #title slot and a #footer slot", async () => {
    const html = flat(
      await render(
        `::git-graph\n#title\nThe **stack**\n\n#default\n\`\`\`\n${fixture("stack")}\n\`\`\`\n\n#footer\n- [ ] Merge #102\n::`,
      ),
    );
    expect(html).toContain('<span class="cgg-title">The <strong>stack</strong></span>');
    expect(html).toContain('<div class="cgg-footer"><ul');
    expect(html).toContain("Merge #102");
  });

  it("escapes what git printed", async () => {
    const html = await render(
      block('* abc1234 (HEAD -> main) Render <script>alert(1)</script> & "quotes"'),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("reports what it can't draw, each under its own rule", async () => {
    const cases: [string, string, RegExp][] = [
      [
        "::git-graph\n::",
        "comark/git-graph/missing-log",
        /`::git-graph` 1 has no commits to draw. Paste the output of `git log --graph --oneline --decorate --parents`/,
      ],
      [
        block("* bbbbbbb (HEAD -> main) Second\n* aaaaaaa First"),
        "comark/git-graph/missing-parents",
        /run without `--parents`/,
      ],
      [
        block(`${fixture("stack")}\n$ git switch release/9\n$ git cherry-pick 0d65aff`),
        "comark/git-graph/unknown-branch",
        /`git switch release\/9` names `release\/9`, a branch the `git log` above doesn't show/,
      ],
      [
        block(`${fixture("stack")}\n$ git cherry -v main stack/sign-in-docs\n- 9999999aaaa Gone`),
        "comark/git-graph/unknown-commit",
        /names 9999999, a commit the `git log` above doesn't show/,
      ],
      [
        block(fixture("stack"), '{order="oldest"}'),
        "comark/git-graph/unknown-prop",
        /`order` isn't a prop of `::git-graph`/,
      ],
      [
        block(fixture("stack"), "{max-count=zero}"),
        "comark/git-graph/invalid-max-count",
        /`max-count` is "zero", so every commit shows/,
      ],
      [
        `::git-graph\nSome words\n\`\`\`\n${fixture("stack")}\n\`\`\`\n::`,
        "comark/git-graph/content-dropped",
        /drops the text beside its fence/,
      ],
    ];
    for (const [markdown, rule, message] of cases) {
      const { meta } = await parse(markdown);
      const issue = meta.issues?.find((text: string) => message.test(text));
      expect(issue, rule).toBeDefined();
      expect(meta.issueRules?.[issue ?? ""]).toBe(rule);
    }
  });

  it("renders nothing for a block with no commits, and nothing is reported for a good one", async () => {
    expect(flat(await render("::git-graph\n::"))).not.toContain("cgg");
    expect((await parse(block(fixture("backport")))).meta.issues ?? []).toEqual([]);
  });
});
