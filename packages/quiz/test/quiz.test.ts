import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import quiz, { components, type QuizOptions } from "../src/html.ts";

async function run(markdown: string, options?: QuizOptions) {
  const document = await parseMarkdown(markdown, { plugins: [quiz(options)] });
  const full = await renderHtmlFromDocument(document, { components });
  return {
    issues: document.meta.issues as string[],
    rules: document.meta.issueRules as Record<string, string>,
    full,
    html: full
      .replace(/<style data-comark-quiz>.*?<\/style>/s, "")
      .replace(/<script>.*?<\/script>/s, ""),
  };
}

const question = (props = "{#event-loop}", options = defaultOptions) =>
  `::question${props}\nWhich callback runs first?\n\n${options}\n\n#hint\nThink about queues.\n\n#explain\nMicrotasks drain first.\n::\n`;
const defaultOptions = [
  "- [x] A promise's `then` callback",
  "  > Promise callbacks are microtasks.",
  "- [ ] A `setTimeout(fn, 0)` callback",
  "  > Timers queue a task.",
  "- [ ] A `requestAnimationFrame` callback",
  "  > It runs before the next paint.",
].join("\n");
const reordered = [
  "- [ ] A `requestAnimationFrame` callback",
  "  > It runs before the next paint.",
  "- [x] A promise's `then` callback",
  "  > Promise callbacks are microtasks.",
  "- [ ] A `setTimeout(fn, 0)` callback",
  "  > Timers queue a task.",
].join("\n");

// Each option row's key, whether it's marked right, and its text, in the order readers see.
const rows = (html: string) =>
  [
    ...html.matchAll(
      /<div class="cqz-option" data-slot="option" data-key="([\w-]+)" data-state="idle"( data-correct)?>.*?<span class="cqz-label" data-slot="label">(.*?)<\/span>/gs,
    ),
  ].map(([, key, correct, label]) => ({
    key,
    correct: Boolean(correct),
    label: label!.replaceAll(/<[^>]+>/g, ""),
  }));
const ruleOf = (result: Awaited<ReturnType<typeof run>>) =>
  result.issues.map((issue) => result.rules[issue]);

describe("::question", () => {
  it("renders the prompt, options, and slots with the attributes a host maps answers by", async () => {
    const { issues, html } = await run(question());
    expect(issues).toEqual([]);
    expect(html).toMatch(
      /^<div class="cqz" data-slot="root" data-quiz-id="event-loop" data-quiz-kind="question" data-state="idle">/,
    );
    expect(html).toContain('<span class="cqz-number" data-slot="number"');
    expect(html).toContain(">1.</span>");
    expect(html).toMatch(
      /<fieldset class="cqz-options" data-slot="options" aria-labelledby="[\w-]+-number [\w-]+-prompt">/,
    );
    expect(html).toContain('<div class="cqz-status" data-slot="status" role="status"></div>');
    expect(html).toContain('data-action="check">Check</button>');
    expect(html).toContain('<div class="cqz-hint-body">Think about queues.</div>');
    expect(html).toContain(
      '<div class="cqz-explain" data-slot="explain">Microtasks drain first.</div>',
    );
    const options = rows(html);
    expect(options).toHaveLength(3);
    expect(options.filter((option) => option.correct).map((option) => option.label)).toEqual([
      "A promise's then callback",
    ]);
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    // The script waits for this marker, the block's last child, before it reads a block a page is still loading.
    expect(html).toMatch(/<template class="cqz-end"><\/template><\/div>$/);
  });

  it("reads without a script: the answer key, the rationales, and the explanation sit in a <details>", async () => {
    const { html } = await run(question());
    const details = html.slice(html.lastIndexOf("<details"));
    expect(details).toMatch(
      /^<details class="cqz-disclosure" data-slot="disclosure"><summary class="cqz-button" data-variant="outline">Show answer<\/summary>/,
    );
    expect(details).toContain(
      'Correct answer</span><div class="cqz-key-label">A promise\'s <code>then</code> callback</div>',
    );
    expect(details).toContain("Timers queue a task.");
    expect(details).toContain("Microtasks drain first.");
    // The key's rows don't carry `data-key` or `data-correct`, so a host reading the page finds each option once.
    expect(details).not.toMatch(/data-key|data-correct/);
  });

  it("shuffles the same way every time, whatever order the author wrote", async () => {
    const first = rows((await run(question())).html);
    expect(rows((await run(question())).html)).toEqual(first);
    expect(rows((await run(question("{#event-loop}", reordered))).html)).toEqual(first);
    expect(first.map((option) => option.label)).not.toEqual([
      "A promise's then callback",
      "A setTimeout(fn, 0) callback",
      "A requestAnimationFrame callback",
    ]);
  });

  it("keys each option by its text, so keys survive reordering and a changed id", async () => {
    const keys = (html: string) =>
      Object.fromEntries(rows(html).map((option) => [option.label, option.key]));
    const before = keys((await run(question())).html);
    expect(keys((await run(question("{#event-loop}", reordered))).html)).toEqual(before);
    expect(keys((await run(question("{#other-id}"))).html)).toEqual(before);
    expect(new Set(Object.values(before)).size).toBe(3);
  });

  it("keeps the author's order with shuffle off", async () => {
    const { html, issues } = await run(question('{#event-loop shuffle="false"}'));
    expect(issues).toEqual([]);
    expect(rows(html).map((option) => option.label)).toEqual([
      "A promise's then callback",
      "A setTimeout(fn, 0) callback",
      "A requestAnimationFrame callback",
    ]);
  });

  it("reads options with and without a paragraph around them", async () => {
    const loose = "::question{#q}\nPick one.\n\n- [x] Right\n\n- [ ] Wrong\n\n  > Because.\n::";
    const tight = "::question{#q}\nPick one.\n\n- [x] Right\n- [ ] Wrong\n  > Because.\n::";
    for (const markdown of [loose, tight]) {
      const { html, issues } = await run(markdown);
      expect(issues).toEqual([]);
      expect(rows(html).map((option) => [option.label, option.correct])).toEqual(
        expect.arrayContaining([
          ["Right", true],
          ["Wrong", false],
        ]),
      );
      expect(html).toContain('data-slot="rationale"');
    }
  });

  it("uses checkboxes for several right options or the multiple prop", async () => {
    const several = await run(
      '::question{#q}\nWhich are falsy?\n\n- [x] `0`\n- [x] `""`\n- [ ] `[]`\n  > Objects are truthy.\n::',
    );
    expect(several.html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(several.html).toContain("data-multiple");
    const one = await run(
      "::question{#q multiple}\nWhich are falsy?\n\n- [x] `0`\n- [ ] `[]`\n  > Objects are truthy.\n::",
    );
    expect(one.html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(one.issues).toEqual([]);
  });

  it("falls back to an id hashed from its text, the same wherever the block sits", async () => {
    const block = question("");
    const alone = await run(block);
    const id = /data-quiz-id="([^"]+)"/.exec(alone.html)![1];
    expect(id).toMatch(/^question-[a-z0-9]+$/);
    const later = await run(`::recall{#r}\nWhy?\n\n#answer\nBecause.\n::\n\n${block}`);
    expect(later.html).toContain(`data-quiz-id="${id}"`);
    expect(ruleOf(alone)).toEqual(["comark/quiz/missing-id"]);
  });

  it("translates every word through the labels option", async () => {
    const { html } = await run(question(), {
      labels: { check: "Comprobar", showAnswer: "Ver respuesta", hint: "Pista" },
    });
    expect(html).toContain(">Comprobar</button>");
    expect(html).toContain("Ver respuesta</summary>");
    expect(html).toContain("Pista</button>");
    expect(html).toContain(
      'data-labels="{&quot;check&quot;:&quot;Comprobar&quot;,&quot;showAnswer&quot;:&quot;Ver respuesta&quot;,&quot;hint&quot;:&quot;Pista&quot;}"',
    );
  });
});

describe("::poll", () => {
  const poll = (props = "{#next-topic}") =>
    `::poll${props}\nWhat should the next lesson cover?\n\n- [ ] Workers\n- [ ] Streams\n- [ ] Caching\n::\n`;

  it("keeps the author's order and waits for a host, with no number and no answer key", async () => {
    const { html, issues } = await run(poll());
    expect(issues).toEqual([]);
    expect(rows(html).map((option) => option.label)).toEqual(["Workers", "Streams", "Caching"]);
    expect(html).not.toContain("cqz-number");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("data-correct");
    expect(html.match(/ disabled>/g)).toHaveLength(3);
    expect(html).toContain(
      '<span class="cqz-notice" data-slot="notice">Voting needs a host that collects votes.</span>',
    );
    expect(html).toContain('<span class="cqz-total" data-slot="total" role="status"></span>');
  });

  it("renders as closed once its closing date has passed", async () => {
    const { html } = await run(poll('{#next-topic closes="2020-01-01"}'));
    expect(html).toContain('data-state="closed" data-closes="2020-01-01"');
    expect(html).toContain(">Voting closed</span>");
  });
});

describe("::recall", () => {
  it("hides its answer in a <details> until the script upgrades it", async () => {
    const { html, issues } = await run(
      "::recall{#why-microtasks}\nWhy does `then` run before `setTimeout`?\n\n#answer\nMicrotasks drain first.\n::",
    );
    expect(issues).toEqual([]);
    expect(html).toContain('data-quiz-kind="recall"');
    expect(html).toMatch(
      /<div class="cqz-reveal" data-slot="reveal" id="[\w-]+-answer" tabindex="-1"><\/div>/,
    );
    expect(html).toContain(
      '<details class="cqz-disclosure" data-slot="disclosure"><summary class="cqz-button" data-variant="outline">Show answer</summary><div class="cqz-answer" data-slot="answer">Microtasks drain first.</div></details>',
    );
    expect(html).toContain('data-action="knew" aria-pressed="false" hidden>I knew it</button>');
  });

  it("shares one counter with questions, and number=false leaves a block out of it", async () => {
    const { html } = await run(
      [
        question("{#one}"),
        "::poll{#p}\nPick.\n\n- [ ] A\n- [ ] B\n::",
        '::recall{#two number="false"}\nWhy?\n\n#answer\nBecause.\n::',
        "::recall{#three}\nWhy?\n\n#answer\nBecause.\n::",
      ].join("\n\n"),
    );
    expect([...html.matchAll(/data-slot="number"[^>]*>(\d+)\.</g)].map(([, n]) => n)).toEqual([
      "1",
      "2",
    ]);
  });
});

describe("the runtime", () => {
  it("inlines the styles and the script once per document, after the first block", async () => {
    const { full } = await run(`${question("{#a}")}\n\n${question("{#b}")}`);
    expect(full.match(/<style data-comark-quiz>/g)).toHaveLength(1);
    expect(full.match(/<script>/g)).toHaveLength(1);
    expect(full.indexOf("<script>")).toBeLessThan(full.indexOf('data-quiz-id="b"'));
    expect(full).toContain("comark-quiz:answer");
    expect(full).toContain("@layer comark{");
  });

  it("keeps a label from closing the script", async () => {
    const { full } = await run(question(), { labels: { correct: "</script><b>" } });
    const script = full.slice(full.indexOf("<script>") + 8);
    expect(script.indexOf("</script>")).toBe(script.length - 9);
  });
});

describe("issues", () => {
  const cases: [string, string, string][] = [
    ["no-options", "::question{#q}\nPick one.\n::", "`::question` 1 (`#q`) has no options."],
    [
      "no-correct-option",
      "::question{#q}\nPick.\n\n- [ ] A\n  > No.\n- [ ] B\n  > No.\n::",
      "`::question` 1 (`#q`) marks no option `[x]`",
    ],
    [
      "correct-in-poll",
      "::poll{#p}\nPick.\n\n- [x] A\n- [ ] B\n::",
      '`::poll` 1 (`#p`) marks "A" `[x]`, but a poll has no right answer.',
    ],
    ["missing-answer", "::recall{#r}\nWhy?\n::", "`::recall` 1 (`#r`) has no `#answer`"],
    [
      "duplicate-id",
      "::poll{#p}\nPick.\n\n- [ ] A\n- [ ] B\n::\n\n::poll{#p}\nAgain.\n\n- [ ] C\n- [ ] D\n::",
      "`::poll` 2 (`#p`) has the same id as `::poll` 1 (`#p`)",
    ],
    [
      "longest-correct",
      "::question{#q}\nWhat does `await` do?\n\n- [x] It pauses the async function until the promise settles, then resumes it with the value\n- [ ] It blocks\n  > No.\n- [ ] It throws\n  > No.\n::",
      "`::question` 1 (`#q`): the right option",
    ],
    [
      "position-option",
      "::question{#q}\nPick.\n\n- [x] A\n- [ ] B\n  > No.\n- [ ] All of the above\n  > No.\n::",
      '`::question` 1 (`#q`): the option "All of the above" points at other options by place',
    ],
    [
      "missing-rationale",
      "::question{#q}\nPick.\n\n- [x] A\n- [ ] B\n::",
      '`::question` 1 (`#q`): the wrong option "B" doesn\'t say why',
    ],
    [
      "line-break-option",
      "::question{#q}\nPick.\n\n- [x] A\n- [ ] B\n  it's wrong\n  > No.\n::",
      '`::question` 1 (`#q`): the option "B" runs onto a second line',
    ],
    [
      "swallowed-slot",
      "::question{#q}\nPick.\n\n- [x] A\n- [ ] B\n  > No.\n#explain\nBecause.\n::",
      '`::question` 1 (`#q`): `#explain` is inside the option "B"',
    ],
    [
      "too-many-options",
      `::poll{#p}\nPick.\n\n${["A", "B", "C", "D", "E", "F", "G"].map((x) => `- [ ] ${x}`).join("\n")}\n::`,
      "`::poll` 1 (`#p`) has 7 options.",
    ],
    [
      "unknown-prop",
      '::poll{#p random="yes"}\nPick.\n\n- [ ] A\n- [ ] B\n::',
      "`::poll` 1 (`#p`): `random` isn't a prop of `::poll`",
    ],
    [
      "unknown-slot",
      "::question{#q}\nPick.\n\n- [x] A\n- [ ] B\n  > No.\n\n#explanation\nWhy.\n::",
      "`::question` 1 (`#q`): `#explanation` isn't a slot of `::question`, so it's dropped. Did you mean `#explain`?",
    ],
    [
      "invalid-closes",
      '::poll{#p closes="next week"}\nPick.\n\n- [ ] A\n- [ ] B\n::',
      '`::poll` 1 (`#p`): `closes` "next week" isn\'t a date',
    ],
    [
      "nested-block",
      "::recall{#r}\nWhy?\n\n#answer\n:::poll{#p}\nPick.\n\n- [ ] A\n- [ ] B\n:::\n::",
      "`::poll` 1 sits inside `::recall` 1",
    ],
  ];
  for (const [kind, markdown, start] of cases)
    it(`reports ${kind} under its rule, naming the block`, async () => {
      const result = await run(markdown);
      expect(ruleOf(result)).toEqual([`comark/quiz/${kind}`]);
      expect(result.issues[0]).toContain(start);
    });

  it("reports two blocks without ids that hash to one id, besides each missing id", async () => {
    const block = "::poll\nPick.\n\n- [ ] A\n- [ ] B\n::";
    const result = await run(`${block}\n\n${block}`);
    expect(ruleOf(result)).toEqual([
      "comark/quiz/missing-id",
      "comark/quiz/missing-id",
      "comark/quiz/duplicate-id",
    ]);
    expect(result.issues[2]).toContain("`::poll` 2 has the same id as `::poll` 1");
  });

  it("renders a block it can't read without throwing", async () => {
    const { html } = await run(
      "::question\n::\n\n::poll\n::\n\n::recall\n::\n\n::question{#q}\nPick.\n\n- [ ] A\n- [ ] B\n::",
    );
    expect(html.match(/class="cqz"/g)).toHaveLength(4);
    // A question with no right option can't be checked, so it has no Check button.
    expect(html).not.toContain('data-action="check"');
  });

  it("renders a nested block as its content", async () => {
    const { html } = await run(
      "::recall{#r}\nWhy?\n\n#answer\n:::poll{#p}\nPick.\n\n- [ ] A\n- [ ] B\n:::\n::",
    );
    expect(html.match(/data-quiz-id=/g)).toHaveLength(1);
    expect(html).toContain("Pick.");
  });
});
