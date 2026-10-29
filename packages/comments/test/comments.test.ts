import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import comments, { type CommentsOptions, components } from "../src/html.ts";

// The renderer indents blocks, and every document carries the styles; the tests compare the markup alone.
const flat = (html: string) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/\s*\n\s*/g, "")
    .replace(/cr-[a-z0-9]+-(\d+)/g, "cr-x-$1");
const render = async (markdown: string, options: CommentsOptions = {}) =>
  flat(await createHtmlRenderer({ plugins: [comments(options)], components })(markdown));
const raw = async (markdown: string, options: CommentsOptions = {}) =>
  createHtmlRenderer({ plugins: [comments(options)], components })(markdown);
const parse = async (markdown: string) => {
  const tree = await parseMarkdown(markdown, { plugins: [comments()] });
  return { issues: tree.meta.issues ?? [], rules: tree.meta.issueRules ?? {} };
};
const rules = async (markdown: string) => {
  const { issues, rules } = await parse(markdown);
  return issues.map((issue) => rules[issue]);
};

const review = [
  'To :suggestion[sign in]{from="log in" by="Claude" note="The button says Sign in."}, enter your email.',
  "",
  'The link expires after :comment[15 minutes]{#ttl by="@onmax" note="Is 15 minutes enough?"}.',
  "",
  ':comment{reply="ttl" by="Claude" note="Keeping 15."}',
  "",
  'Signing out doesn’t sign you out on :suggestion[your other devices]{from="the others" by="Claude"}.',
].join("\n");

describe("comark-comments", () => {
  it("draws suggestions and comments with a bubble and a card, and replies in their thread", async () => {
    const html = await render(review);
    expect(html).toBe(
      '<div class="cr">' +
        '<p>To <span class="cr-sg" data-mark="track" data-kind="replace"><del>log in</del><ins>sign in</ins></span>' +
        '&#8288;<input class="cr-tg" type="checkbox" id="cr-x-1" aria-label="1 comment on “sign in”"><label class="cr-bub" for="cr-x-1"></label>' +
        '<span class="cr-card" role="note"><span class="cr-entry"><span class="cr-av" style="--cr-av:' +
        html.match(/--cr-av:(#[0-9a-f]+)/)![1] +
        '" aria-hidden="true">C</span><b>Claude</b>The button says Sign in.</span></span>, enter your email.</p>' +
        html.slice(html.indexOf("<p>The link")),
    );
    expect(html).toContain(
      '<p>The link expires after <mark class="cr-cm" id="ttl">15 minutes</mark>&#8288;<input class="cr-tg" type="checkbox" id="cr-x-2" aria-label="2 comments on “15 minutes”"><label class="cr-bub" for="cr-x-2">2</label>',
    );
    // A leading @ doesn't show, and the reply follows the comment in its card.
    expect(html).toMatch(
      /<b>onmax<\/b>Is 15 minutes enough\?<\/span><span class="cr-entry">.*<b>Claude<\/b>Keeping 15\.<\/span><\/span>\.<\/p>/,
    );
    // The reply's paragraph is gone, and a suggestion with no note is only a redline.
    expect(html).toContain(
      '<p>Signing out doesn’t sign you out on <span class="cr-sg" data-mark="track" data-kind="replace"><del>the others</del><ins>your other devices</ins></span>.</p></div>',
    );
    expect(html.match(/<p>/g)).toHaveLength(3);
    expect(await parse(review)).toEqual({ issues: [], rules: {} });
  });

  it("draws a deletion and an insertion", async () => {
    expect(await render(':suggestion[]{from="simply"} enter :suggestion[and works once]')).toBe(
      '<p><span class="cr-sg" data-mark="track" data-kind="delete"><del>simply</del></span> enter <span class="cr-sg" data-mark="track" data-kind="insert"><ins>and works once</ins></span></p>',
    );
    expect(await render(':suggestion{from="simply"} enter')).toContain(
      '<span class="cr-sg" data-mark="track" data-kind="delete"><del>simply</del></span>',
    );
  });

  it("leaves out the root and its margin when no card needs it", async () => {
    const html = await raw(':suggestion[sign in]{from="log in"}');
    expect(html).not.toContain('class="cr"');
    expect(html).toContain("<style data-comark-comments>");
  });

  it("writes the styles once, and the handwriting font only with a pen mark", async () => {
    const track = await raw(review);
    expect(track.match(/<style data-comark-comments>/g)).toHaveLength(1);
    expect(track).not.toContain("comark-caveat;src");
    const pen = await raw(`${review}\n\n:suggestion[b]{from="a"}`, { mark: "pen" });
    expect(pen.match(/<style data-comark-comments-font>/g)).toHaveLength(1);
  });

  it("draws pen for short plain changes, and track for the rest", async () => {
    const html = await render(
      [
        ':suggestion[sign in]{from="log in"}',
        ':suggestion[and works once]{note="x"}',
        ':suggestion[Check your spam folder if the email takes long]{from="If the email doesn’t arrive"}',
        ':suggestion[`npm i`]{from="install"}',
        ':suggestion[b]{from="a" mark="track"}',
      ].join(" "),
      { mark: "pen" },
    );
    const marks = [...html.matchAll(/data-mark="(\w+)" data-kind="(\w+)"/g)].map(
      (m) => `${m[1]} ${m[2]}`,
    );
    expect(marks).toEqual([
      "pen replace",
      "pen insert",
      "track replace",
      "track replace",
      "track replace",
    ]);
    expect(html).toContain('<del>log in<svg class="cr-strike"');
    expect(html).toContain('<span class="cr-caret" aria-hidden="true">');
    // A pen mark is an inline block, so it and its bubble sit in a span that doesn't wrap.
    expect(html).toContain(
      '<span class="cr-keep"><span class="cr-sg" data-mark="pen" data-kind="insert">',
    );
    expect(await render(':suggestion[b]{from="a" mark="pen"}')).toContain('data-mark="pen"');
  });

  it("counts a suggestion's replies, and opens a card for replies alone", async () => {
    const html = await render(
      ':suggestion[b]{from="a" #s}\n\n:comment{reply="s" by="sam" note="Why?"}',
    );
    expect(html).toContain('aria-label="1 comment on “b”"');
    expect(html).toContain("<b>sam</b>Why?");
  });

  it("escapes notes and authors", async () => {
    const html = await render(':comment[x]{by="<b>" note="a <script> & \\"q\\""}');
    expect(html).toContain("<b>&lt;b&gt;</b>a &lt;script&gt; &amp;");
  });

  it("gives every document its own ids", async () => {
    const one = await raw(':comment[a]{note="x"}');
    const two = await raw(':comment[b]{note="x"}');
    const id = (html: string) => /id="(cr-[^"]+)"/.exec(html)![1];
    expect(id(one)).not.toBe(id(two));
  });

  describe("issues", () => {
    it("reports an unknown prop, and suggests note for reason", async () => {
      const { issues, rules } = await parse(':suggestion[sign in]{from="log in" reason="x"}');
      expect(issues).toEqual([
        'suggestion "log in" → "sign in" has `reason`, which isn\'t one of its props, so it\'s ignored. Did you mean `note`? Use `from`, `by`, `note`, `mark`, `#id`.',
      ]);
      expect(rules[issues[0]!]).toBe("comark/comments/unknown-prop");
    });

    it("reports an empty suggestion and renders nothing", async () => {
      expect(await rules("A :suggestion[] b")).toEqual(["comark/comments/empty-suggestion"]);
      expect(await render("A :suggestion[] b")).toBe("<p>A  b</p>");
    });

    it("reports a suggestion that changes nothing and renders its text", async () => {
      expect(await rules(':suggestion[same]{from="same"}')).toEqual([
        "comark/comments/unchanged-suggestion",
      ]);
      expect(await render(':suggestion[same]{from="same" note="x"}')).toBe("<p>same</p>");
    });

    it("reports an invalid mark and draws track", async () => {
      expect(await rules(':suggestion[b]{from="a" mark="marker"}')).toEqual([
        "comark/comments/invalid-mark",
      ]);
      expect(await render(':suggestion[b]{from="a" mark="marker"}')).toContain('data-mark="track"');
    });

    it("reports a comment with no anchor, and one with no note", async () => {
      expect(await rules('A :comment{note="Why?"} b')).toEqual(["comark/comments/missing-anchor"]);
      expect(await render('A :comment{note="Why?"} b')).toBe("<p>A  b</p>");
      expect(await rules("A :comment[b]{by=sam}")).toEqual(["comark/comments/missing-note"]);
      expect(await render("A :comment[b]{by=sam}")).toBe('<p>A <mark class="cr-cm">b</mark></p>');
      expect(await rules(':comment[b]{#x note="y"}\n\n:comment{reply="x" by=sam}')).toEqual([
        "comark/comments/missing-note",
      ]);
    });

    it("reports a duplicate id and sends replies to the first", async () => {
      const markdown =
        ':comment[a]{#x note="1"} :comment[b]{#x note="2"}\n\n:comment{reply="x" note="r"}';
      expect(await rules(markdown)).toEqual(["comark/comments/duplicate-id"]);
      expect(await render(markdown)).toContain('aria-label="2 comments on “a”"');
    });

    it("reports a reply to no id with a did-you-mean, and renders nothing for it", async () => {
      const { issues } = await parse(
        ':comment[a]{#ttl note="1"}\n\n:comment{reply="tll" note="r"}',
      );
      expect(issues).toEqual([
        'reply to "tll" matches no comment or suggestion\'s `#id`, so it renders nothing. Did you mean `reply="ttl"`?',
      ]);
      const html = await render(':comment[a]{#ttl note="1"}\n\n:comment{reply="tll" note="r"}');
      expect(html).not.toContain(">r<");
      expect(html).toContain('aria-label="1 comment on “a”"');
    });

    it("reports a reply with brackets, keeps its text, and still threads it", async () => {
      const markdown = ':comment[a]{#x note="1"} and :comment[kept]{reply="x" note="r"}.';
      expect(await rules(markdown)).toEqual(["comark/comments/reply-with-text"]);
      const html = await render(markdown);
      expect(html).toContain("</span></span> and kept.</p>");
      expect(html).toContain("2 comments");
    });

    it("reports a thread inside another and draws it without a card", async () => {
      const markdown = ':suggestion[new :comment[word]{note="x"}]{from="old" note="y"}';
      expect(await rules(markdown)).toEqual(["comark/comments/nested-thread"]);
      const html = await render(markdown);
      expect(html.match(/cr-card/g)).toHaveLength(1);
      expect(html).toContain("<ins>new word</ins>");
    });

    it("reports a thread in a heading or a table cell and draws it without a card", async () => {
      expect(await rules('# Title :comment[x]{note="y"}')).toEqual([
        "comark/comments/outside-margin",
      ]);
      expect(await render('# Title :comment[x]{note="y"}')).toBe('<h1 id="title-x">Title x</h1>');
      const table = '| a | b |\n| --- | --- |\n| :suggestion[c]{from="d" note="e"} | f |';
      expect(await rules(table)).toEqual(["comark/comments/outside-margin"]);
      expect(await render(table)).not.toContain("cr-card");
    });

    it("appends to the issues other plugins reported", async () => {
      const tree = await parseMarkdown("A :suggestion[]", {
        plugins: [
          defineComarkPlugin(() => ({
            name: "first",
            post(state) {
              state.tree.meta.issues = ["first"];
            },
          }))(),
          comments(),
        ],
      });
      expect(tree.meta.issues).toHaveLength(2);
    });
  });
});
