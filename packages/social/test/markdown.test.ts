import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown, type ElementNode } from "comark";
import { resolveAttributes } from "comark/render";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import social, { components, type SocialOptions } from "../src/html.ts";
import {
  fetchPost,
  postMarkdown,
  textMarkdown,
  threadMarkdown,
  type FetchedPost,
  type PostData,
} from "../src/index.ts";

const NOW = "2026-11-28T12:00:00Z";
const fixture = async (name: string) =>
  JSON.parse(await readFile(new URL(`fixtures/${name}.json`, import.meta.url), "utf8")) as unknown;

async function render(markdown: string, options: SocialOptions = {}) {
  const document = await parseMarkdown(markdown, {
    plugins: [social({ now: NOW, timeZone: "UTC", ...options })],
  });
  const html = await renderHtmlFromDocument(document, { components });
  return {
    html: html.replace(/<style[^>]*>.*?<\/style>/gs, ""),
    issues: document.meta.issues ?? [],
  };
}

const answers = new Map<string, unknown>();
beforeEach(() => {
  answers.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const answer = answers.get(String(input));
      return answer === undefined
        ? new Response("not found", { status: 404 })
        : new Response(JSON.stringify(answer), { headers: { "content-type": "application/json" } });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

// Mastodon servers outside the allowlist need a transport; the stubbed fetch is one.
const request = (url: URL, init: RequestInit) => fetch(url, init);

/** The card `::post{url}` draws with `fetch` on, and the one drawn from `postMarkdown()` of the same post, unfetched. */
async function bothWays(url: string, post: FetchedPost) {
  const fetched = await render(`::post{url="${url}"}\n::`, { fetch: true, request });
  const markdown = await postMarkdown(post);
  const written = await render(markdown);
  return { fetched, written, markdown };
}

/** The props Comark reads back from the first `::post`, and those of the `:::post` inside it. */
async function readProps(markdown: string) {
  const { nodes } = await parseMarkdown(markdown);
  const post = nodes[0] as ElementNode;
  const quote = post
    .slice(2)
    .find((node): node is ElementNode => Array.isArray(node) && node[0] === "post");
  const read = (node: ElementNode) =>
    resolveAttributes(
      node[1],
      { frontmatter: {}, meta: {}, data: {}, props: {} },
      { parseJson: true },
    );
  return { post: read(post), quote: quote && read(quote) };
}

const X = "https://x.com/ada/status/1856000000000000000";
const tweet = (text: string) => ({
  tweet: { url: X, id: "1856000000000000000", text, author: { screen_name: "ada", name: "Ada" } },
});

describe("postMarkdown", () => {
  it("writes a fetched X post, its pictures, and its quote as the card the fetch draws", async () => {
    answers.set(
      "https://api.fxtwitter.com/i/status/1856000000000000000",
      await fixture("fxtwitter"),
    );
    const post = await fetchPost(X);
    const { fetched, written, markdown } = await bothWays(X, post);
    expect(written.issues).toEqual([]);
    expect(written.html).toBe(fetched.html);
    expect(markdown).toBe(
      [
        '::post{url="https://x.com/ada/status/1856000000000000000" author="Ada Lovelace" handle="@ada" avatar="https://pbs.twimg.com/ada_200x200.jpg" time="2024-11-12T10:24:00.000Z" replies="12" reposts="34" likes="1234" views="98765" bookmarks="7"}',
        "Shipped the new parser today 🎉",
        "It reads 2x faster, thanks @grace",
        "",
        "[example.com/blog/parser](https://example.com/blog/parser) #compilers",
        "",
        '![Parse time before and after](https://pbs.twimg.com/chart.png){width="1200" height="675"}',
        "",
        ':::post{url="https://x.com/grace/status/1855000000000000000" author="Grace Hopper" handle="@grace" avatar="https://pbs.twimg.com/grace_200x200.jpg" time="2024-11-07T17:20:00.000Z" replies="1" reposts="1" likes="50"}',
        "Who wants to make the parser fast?",
        ":::",
        "::",
      ].join("\n"),
    );
  });

  it("writes fetched Bluesky and Mastodon posts as the cards the fetch draws, video stills included", async () => {
    answers.set(
      "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=ada.bsky.social",
      { did: "did:plc:abc123" },
    );
    answers.set(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent("at://did:plc:abc123/app.bsky.feed.post/3lxyz")}`,
      await fixture("bluesky"),
    );
    answers.set(
      "https://mastodon.example/api/v1/statuses/113000000000000001",
      await fixture("mastodon"),
    );
    for (const url of [
      "https://bsky.app/profile/ada.bsky.social/post/3lxyz",
      "https://mastodon.example/@ada/113000000000000001",
    ]) {
      const { fetched, written } = await bothWays(url, await fetchPost(url, { request }));
      expect(written.issues).toEqual([]);
      expect(written.html).toBe(fetched.html);
    }
    expect(
      (
        await render(
          await postMarkdown(
            await fetchPost("https://mastodon.example/@ada/113000000000000001", { request }),
          ),
        )
      ).html,
    ).toContain('<span class="csl-video"><img src="https://mastodon.example/v.jpg" alt="A demo"');
  });

  const texts = [
    "Docs!https://example.com/docs",
    `He said "hi", 'bye', and it's fine`,
    "{curly} {{ binding }} {++critic++} {--gone--} word{.class} [span]{#id}",
    "::post\n:::thread\n::\n:::\n::post{author=x}",
    ':icon{name="lucide:x"} :smile: :$var note: x 10:30 mailto:ada@example.com ftp://example.org',
    "# not a heading\n## nor this\n#hashtag at the start #second",
    "`code` ``double`` ```fence``` ~~~",
    "```js\nconst a = 1\n```\n~~~\nx\n~~~",
    "🎉 👨‍👩‍👧 ✨ 🇪🇸 — emoji",
    "日本語の**テキスト**です。中文，“引号”。한국어 *강조*",
    "see https://example.com/a_b*c?x=1&y=2#frag, and (https://en.wikipedia.org/wiki/Foo_(bar)).",
    "https://example.com/very/long/path/that/gets/shortened/on/the/card?q=1 and http://plain.example",
    "https://example.com/?a=&copy;&b=x \\x end",
    "- list\n* star\n+ plus\n1. one\n2) two\n> quote\n---\n===\n= x\n: definition",
    "text\n---\nmore\n===",
    "| a | b |\n|---|---|\n| 1 | 2 |\na | b\n--|--",
    "<div>html</div> <b>bold</b> <!-- comment --> &amp; &copy; &#123; &nbsp;",
    "$x$ $$y$$ \\(z\\) \\[w\\] costs 5$ and $5",
    "==mark== ^sup^ ~~del~~ ~sub~ ++ctrl+k++ C++ a=b a==b",
    "back\\slash and one at the end\\",
    "[link](https://x.com) ![img](a.png) [^1] [[toc]] [!NOTE] !!! note",
    "*emph* _under_ __strong__ **bold** snake_case_name a * b",
    "@mention, email ada@example.com, and @grace@other.example",
    "  leading\n    four spaces in\ntrailing   \n\tthe end  ",
    "a\n   \nb",
    "line one\n\n\n\nafter blank lines",
    "100% <3 -> => 1 < 2 > 0",
    "\\- escaped already \\* and \\\\",
  ];

  it.each(texts)("writes text Comark reads back as the same card: %j", async (text) => {
    answers.set("https://api.fxtwitter.com/i/status/1856000000000000000", tweet(text));
    const post = await fetchPost(X, { request });
    expect(post.text).toBe(text);
    const { fetched, written, markdown } = await bothWays(X, post);
    expect(fetched.issues).toEqual([]);
    expect(written.issues).toEqual([]);
    expect(written.html, markdown).toBe(fetched.html);
  });

  it.each([
    "The `[` key is paired with ]",
    `Both "double" and 'single'\nEnds with a backslash\\`,
    "Line one\n\n::\nLine two",
  ])("writes a fetched photo without changing its alt text: %j", async (alt) => {
    answers.set("https://api.fxtwitter.com/i/status/1856000000000000000", {
      tweet: {
        ...tweet("A photo").tweet,
        media: { photos: [{ url: "https://pbs.twimg.com/chart.png", altText: alt }] },
      },
    });
    const post = await fetchPost(X, { request });
    expect(post.media?.[0]?.alt).toBe(alt);
    const { fetched, written, markdown } = await bothWays(X, post);
    expect(fetched.html).toContain('<img src="https://pbs.twimg.com/chart.png"');
    expect(written.issues).toEqual([]);
    expect(written.html, markdown).toBe(fetched.html);
  });

  it("quotes props so Comark reads them back exactly", async () => {
    const tricky = [
      'Ada "The Countess" Lovelace',
      "O'Brien",
      `Both "double" and 'single'`,
      "back\\slash",
      "ends with a backslash\\",
      "{braces} and }",
      ":icon{name=x} #tag @me",
      "two\nlines",
      "日本語 🎉",
    ];
    for (const author of tricky) {
      const post: PostData = {
        platform: "threads",
        author,
        handle: author,
        time: "2026-11-20T09:30:00Z",
        counts: { likes: 1234, views: "1.2K" },
        quote: { author, text: "quoted" },
      };
      const { post: props, quote } = await readProps(await postMarkdown(post));
      expect(props).toEqual({
        platform: "threads",
        author,
        handle: author,
        time: "2026-11-20T09:30:00Z",
        likes: "1234",
        views: "1.2K",
      });
      expect(quote).toEqual({ author });
    }
  });

  it("writes platform only when the address doesn't say it", async () => {
    expect(await postMarkdown({ platform: "x", url: X, text: "hi" })).toBe(
      `::post{url="${X}"}\nhi\n::`,
    );
    expect(
      await postMarkdown({ platform: "bluesky", url: "https://example.com/post/1", text: "hi" }),
    ).toBe('::post{platform="bluesky" url="https://example.com/post/1"}\nhi\n::');
    expect(await postMarkdown({})).toBe("::post\n::");
  });

  it("writes each picture where src says, such as a file saved with the document", async () => {
    const seen: string[] = [];
    const markdown = await postMarkdown(
      {
        url: X,
        author: "Ada",
        avatar: "https://pbs.twimg.com/ada.jpg",
        media: [
          { src: "https://pbs.twimg.com/a.png", alt: "A [chart] of *speed*" },
          { src: "https://pbs.twimg.com/b.png" },
          { src: "https://pbs.twimg.com/c.jpg", video: true },
          { src: "https://pbs.twimg.com/d.png", alt: 'Step 1] of "2"' },
          { src: "https://pbs.twimg.com/e.png" },
        ],
        quote: { author: "Grace", avatar: "https://pbs.twimg.com/grace.jpg" },
      },
      {
        src: async (url, { kind, index, post }) => {
          seen.push(`${post.author} ${kind} ${index}`);
          return url.includes("/b.") ? undefined : `./${post.author}-${kind}-${index} (1).png`;
        },
      },
    );
    expect(seen).toEqual([
      "Ada avatar 0",
      "Ada media 0",
      "Ada media 1",
      "Ada media 2",
      "Ada media 3",
      "Grace avatar 0",
    ]);
    expect(markdown).toContain('avatar="./Ada-avatar-0 (1).png"');
    expect(markdown).toContain(
      [
        '![](<./Ada-media-0 (1).png>){alt="A [chart] of *speed*"}',
        '![](https://pbs.twimg.com/b.png){alt=""}',
        "![Video](<./Ada-media-2 (1).png>){video}",
        "![](<./Ada-media-3 (1).png>){alt='Step 1] of \"2\"'}",
      ].join("\n"),
    );
    const { html, issues } = await render(markdown);
    expect(issues).toEqual([]);
    expect(html).toContain('<img src="./Ada-media-0%20(1).png" alt="A [chart] of *speed*"');
    expect(html).toContain(
      '<span class="csl-video"><img src="./Ada-media-2%20(1).png" alt="Video"',
    );
    expect(html).toContain('<img src="https://pbs.twimg.com/b.png" alt="">');
    expect(html).toContain('<img src="./Ada-media-3%20(1).png" alt="Step 1] of &quot;2&quot;">');
    expect(html).toContain('<img class="csl-avatar" src="./Grace-avatar-0 (1).png"');
    expect(html).toContain('<div class="csl-media" data-count="4">');
  });

  it("nests deeper with colons, and leaves out a quote's own quote", async () => {
    const markdown = await postMarkdown(
      {
        author: "Ada",
        text: "outer",
        quote: { author: "Grace", text: "inner", quote: { author: "Lin" } },
      },
      { colons: 3 },
    );
    expect(markdown).toBe(
      ':::post{author="Ada"}\nouter\n\n::::post{author="Grace"}\ninner\n::::\n:::',
    );
    const { html, issues } = await render(`::columns\n${markdown}\n::`);
    expect(issues).toEqual([]);
    expect(html).toContain('data-quote aria-label="Post by Grace"');
  });
});

describe("threadMarkdown", () => {
  it("writes a fetched thread as the card the fetch draws", async () => {
    for (let id = 1; id <= 3; id++)
      answers.set(`https://mastodon.example/api/v1/statuses/${id}`, {
        id: String(id),
        created_at: `2026-11-10T08:0${id}:00.000Z`,
        in_reply_to_id: id > 1 ? String(id - 1) : null,
        url: `https://mastodon.example/@ada/${id}`,
        content: `<p>Toot ${id}: {props} and :icon[x]</p>`,
        account: { acct: "ada", username: "ada", display_name: "Ada" },
        replies_count: id,
        media_attachments: [],
      });
    const chain: FetchedPost[] = [];
    for (let next: string | undefined = "https://mastodon.example/@ada/3"; next;) {
      const post = await fetchPost(next, { request });
      chain.unshift(post);
      next = post.replyTo;
    }
    const markdown = await threadMarkdown(chain);
    const fetched = await render('::thread{url="https://mastodon.example/@ada/3"}\n::', {
      fetch: true,
      request,
    });
    const written = await render(markdown);
    expect(written.issues).toEqual([]);
    expect(markdown).toMatch(/^::thread\n:::post\{url="https:\/\/mastodon.example\/@ada\/1"/);
    expect(markdown.match(/^:::$/gm)).toHaveLength(3);
    expect(written.html).toContain('aria-label="Thread of 3 posts on Mastodon"');
    expect(written.html).toBe(fetched.html);
  });

  it("writes each post's quote one level deeper, and focal and colons as asked", async () => {
    const pictures: string[] = [];
    const markdown = await threadMarkdown(
      [
        {
          platform: "bluesky",
          author: "Ada",
          text: "First",
          media: [{ src: "https://cdn.bsky.app/a.jpg" }],
        },
        {
          author: "Ada",
          text: "Second",
          media: [{ src: "https://cdn.bsky.app/b.jpg" }],
          quote: { author: "Grace", text: "Quoted" },
        },
      ],
      {
        focal: false,
        colons: 3,
        src: (_url, { index, post }) => {
          pictures.push(`${post.text} ${index}`);
          return `./${post.text}-${index}.jpg`;
        },
      },
    );
    expect(pictures).toEqual(["First 0", "Second 0"]);
    expect(markdown).toBe(
      ':::thread{focal="false"}\n::::post{platform="bluesky" author="Ada"}\nFirst\n\n![](./First-0.jpg){alt=""}\n::::\n\n::::post{author="Ada"}\nSecond\n\n![](./Second-0.jpg){alt=""}\n\n:::::post{author="Grace"}\nQuoted\n:::::\n::::\n:::',
    );
    const { html, issues } = await render(`::columns\n${markdown}\n::`);
    expect(issues).toEqual([]);
    expect(html).toContain('aria-label="Thread of 2 posts on Bluesky"');
    expect(html).toContain('data-quote aria-label="Post by Grace on Bluesky"');
    expect(html).not.toContain("data-focal");
  });
});

describe("textMarkdown", () => {
  it("escapes only what Comark would read as syntax", () => {
    expect(textMarkdown("Plain words, a #tag, and @ada. 10:30, 50% off!")).toBe(
      "Plain words, a #tag, and @ada. 10:30, 50% off!",
    );
    expect(textMarkdown("# a\n- b\n1. c\n:smile: *d*")).toBe(
      "\\# a\n\\- b\n1\\. c\n\\:smile: \\*d\\*",
    );
  });

  it("splits paragraphs as the card splits fetched text", () => {
    const paragraphs = (markdown: string) => markdown.split("\n\n").length;
    expect(paragraphs(textMarkdown("a\n\n\n\nb"))).toBe(2);
    expect(textMarkdown("\n\n  a  \n\n")).toBe("a");
    expect(textMarkdown("")).toBe("");
  });
});
