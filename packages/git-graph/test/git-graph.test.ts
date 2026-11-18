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
      '<figure class="cgg" data-comark-frame data-not-typeset aria-label="How 1.5 shipped"><div class="cgg-head"><span class="cgg-title">How 1.5 shipped</span><span class="cgg-count">5 branches · 21 commits</span></div>',
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

  it("keeps the newest commits with max-count, like git log -n, and folds the rest into one row", async () => {
    const html = flat(await render(block(fixture("history"), "{max-count=14}")));
    expect(rows(html)).toHaveLength(14);
    expect(html).toContain('<span class="cgg-subject cgg-muted">7 more commits</span>');
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

  it("puts each #commit-<sha> slot's Markdown under that commit", async () => {
    const html = flat(
      await render(
        `::git-graph{reverse}\n\`\`\`\n${fixture("backport")}\n\`\`\`\n\n#commit-a94037c\n**2.4** applies clean\n\n#commit-d734\nConflict in \`src/Table.vue\`\n\nTry it on 2.3\n::`,
      ),
    );
    expect(rows(html)[0]).toBe("5de6be0");
    expect(html).toContain('<span class="cgg-count">4 branches · 14 commits</span>');
    expect(html).toContain(
      '<span class="cgg-sha">a94037c</span></div><div class="cgg-note"><strong>2.4</strong> applies clean</div></div>',
    );
    // A whole hash finds its commit too, and two paragraphs read as one line.
    expect(html).toContain(
      '<span class="cgg-sha">d73449f</span></div><div class="cgg-note">Conflict in <code>src/Table.vue</code> Try it on 2.3</div></div>',
    );
    expect(html.match(/<div class="cgg-row" data-notes="">/g)).toHaveLength(2);
  });

  it("drops a note on a commit max-count leaves out, and reports none for it", async () => {
    const markdown = `::git-graph{max-count=2}\n\`\`\`\n${fixture("stack")}\n\`\`\`\n\n#commit-676e7b8\nThe release\n::`;
    expect(flat(await render(markdown))).not.toContain('<div class="cgg-note">');
    expect((await parse(markdown)).meta.issues ?? []).toEqual([]);
  });

  it.each(["", "{max-count=1}"])(
    "rejects ambiguous prefixes before applying max-count %s",
    async (props) => {
      const markdown = `::git-graph${props}\n\`\`\`\n* a123bc0 a123ab0 (HEAD -> main) Newer\n* a123ab0 Older\n\`\`\`\n\n#commit-a123\nAmbiguous note\n::`;
      expect(await render(markdown)).not.toContain("Ambiguous note");
      expect(Object.values((await parse(markdown)).meta.issueRules ?? {})).toEqual([
        "comark/git-graph/ambiguous-commit",
      ]);
    },
  );

  it("matches the printed full hashes without confusing identical display abbreviations", async () => {
    const older = `a123abc${"0".repeat(33)}`;
    const newer = `a123abc${"1".repeat(33)}`;
    const absent = `a123abc${"2".repeat(33)}`;
    const markdown = `::git-graph\n\`\`\`\n* ${newer} ${older} (HEAD -> main) Newer\n* ${older} Older\n\`\`\`\n\n#commit-${older}\nOlder note\n\n#commit-${absent}\nAbsent note\n::`;
    const html = flat(await render(markdown));
    expect(rows(html)).toEqual(["a123abc", "a123abc"]);
    expect(html).toMatch(
      />Older<\/span><span class="cgg-sha">a123abc<\/span><\/div><div class="cgg-note">Older note/,
    );
    expect(html).not.toContain("Absent note");
    expect(Object.values((await parse(markdown)).meta.issueRules ?? {})).toEqual([
      "comark/git-graph/unknown-commit",
    ]);
  });

  it("connects abbreviated parents to full commit hashes across log sections", async () => {
    const parent = `bbbbbbb${"0".repeat(33)}`;
    const log = [
      "$ git log --oneline --parents -1 HEAD",
      "aaaaaaa bbbbbbb (HEAD -> main) Newer",
      "$ git log --parents -1 HEAD^",
      `commit ${parent}`,
      "",
      "    Older",
    ].join("\n");
    const html = flat(await render(block(log)));
    expect(rows(html)).toEqual(["aaaaaaa", "bbbbbbb"]);
    expect(html).toContain('<span class="cgg-count">1 branch · 2 commits</span>');
  });

  it("draws short and full spellings of a commit once and accepts notes using either", async () => {
    const sha = `aaaaaaa${"0".repeat(33)}`;
    const log = [
      "$ git log --oneline --parents -1 HEAD",
      "aaaaaaa Subject",
      "$ git log --parents --decorate -1 HEAD",
      `commit ${sha} (HEAD -> main, tag: v1)`,
      "",
      "    Subject",
    ].join("\n");
    const markdown = `::git-graph\n\`\`\`\n${log}\n\`\`\`\n\n#commit-aaaaaaa\nShort note\n\n#commit-${sha}\nFull note\n::`;
    const html = flat(await render(markdown));
    expect(rows(html)).toEqual(["aaaaaaa"]);
    expect(html).toContain('<span class="cgg-tag">v1</span>');
    expect(html).toContain('<div class="cgg-note">Short note Full note</div>');
    expect((await parse(markdown)).meta.issues ?? []).toEqual([]);
  });

  it("does not guess which full hash an ambiguous parent abbreviation refers to", async () => {
    const first = `bbbbbbb${"0".repeat(33)}`;
    const second = `bbbbbbb${"1".repeat(33)}`;
    const log = [
      "$ git log --oneline --parents -1 HEAD",
      "aaaaaaa bbbbbbb (HEAD -> main) Newer",
      "$ git log --parents -2 other",
      `commit ${second} ${first} (other)`,
      "",
      "    Second",
      `commit ${first}`,
      "",
      "    First",
    ].join("\n");
    const html = flat(await render(block(log)));
    expect(rows(html)).toEqual(["aaaaaaa", "bbbbbbb", "bbbbbbb"]);
    expect(html).toContain('<span class="cgg-count">2 branches · 3 commits</span>');
  });

  it("reports unsupported commands even when no log was pasted", async () => {
    const markdown = "```git-graph\n$ git cherry -v main\n+ a123ab0 Fix\n```";
    expect(Object.values((await parse(markdown)).meta.issueRules ?? {})).toEqual([
      "comark/git-graph/missing-log",
      "comark/git-graph/unread-command",
    ]);
  });

  it("draws a ```git-graph fence like the block, with its [label] as the title", async () => {
    for (const name of ["history", "stack", "backport"]) {
      const log = fixture(name);
      expect(await render(`\`\`\`git-graph [A normal week]\n${log}\n\`\`\``)).toBe(
        await render(block(log, '{title="A normal week"}')),
      );
      expect(await render(`\`\`\`git-graph\n${log}\n\`\`\``)).toBe(await render(block(log)));
    }
  });

  it("draws a ```git-graph fence anywhere in the document, without a $ git log line", async () => {
    const log = fixture("stack").replace(/^\$ git log.*\n/, "");
    const html = flat(
      await render(`- The plan:\n\n  \`\`\`git-graph\n  ${log.replace(/\n/g, "\n  ")}\n  \`\`\``),
    );
    expect(html).toMatch(/<li><p>The plan:<\/p>(<style[^]*?<\/style>)?<figure class="cgg"/);
    expect(html).toContain('<span class="cgg-count">4 branches · 6 commits</span>');
  });

  it("preserves raw HTML pre elements and their fragment targets", async () => {
    const markdown =
      '<a href="#example">Example</a>\n\n<pre id="example" language="git-graph">* aaaaaaa Initial commit</pre>';
    const html = await render(markdown);
    expect(html).toContain('href="#example"');
    expect(html).toContain('<pre id="example" language="git-graph">');
    expect(html).toContain("* aaaaaaa Initial commit");
    expect(html).not.toContain('<figure class="cgg"');
    expect((await parse(markdown)).meta.issues ?? []).toEqual([]);
  });

  it("keeps a ```git-graph fence with no commits as code, and reports it", async () => {
    const markdown = "```git-graph\nnot a log\n```";
    expect(flat(await render(markdown))).toContain("<pre");
    const { meta } = await parse(markdown);
    expect(meta.issues).toEqual([
      "The ```git-graph fence 1 has no commits to draw. Paste the output of `git log --graph --oneline --decorate --parents` in it.",
    ]);
    expect(meta.issueRules?.[meta.issues?.[0] ?? ""]).toBe("comark/git-graph/missing-log");
  });

  it("reads git's long format", async () => {
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
    ].join("\n");
    const html = flat(await render(block(log)));
    expect(html).toContain(
      '<span class="cgg-subject"><span class="cgg-ref">#818</span> Quiet expected 4xx errors</span>',
    );
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
        block(
          `${fixture("stack")}\n$ git switch main\n$ git cherry-pick 45a57b9\n$ git switch main`,
        ),
        "comark/git-graph/unread-command",
        /reads only `git log`, so it leaves out what `git switch` and `git cherry-pick` printed. Leave the other commands out, and say what happened to a commit in a `#commit-<sha>` slot\./,
      ],
      [
        `::git-graph\n\`\`\`\n${fixture("stack")}\n\`\`\`\n#commit-9999999\nGone\n::`,
        "comark/git-graph/unknown-commit",
        /`#commit-9999999` names 9999999, a commit the `git log` above doesn't show/,
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
