import { readFile } from "node:fs/promises";
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import chips, { components as chipComponents } from "comark-chips/html";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import social, { components, type SocialOptions } from "../src/html.ts";
import { fetchPost } from "../src/index.ts";

const fixture = async (name: string) =>
  JSON.parse(await readFile(new URL(`fixtures/${name}.json`, import.meta.url), "utf8")) as unknown;
const NOW = "2026-11-28T12:00:00Z";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

async function render(markdown: string, options: SocialOptions = {}) {
  const document = await parseMarkdown(markdown, {
    plugins: [social({ now: NOW, timeZone: "UTC", ...options })],
  });
  const html = await renderHtmlFromDocument(document, { components });
  return {
    html: html.replace(/<style[^>]*>.*?<\/style>/gs, "").replace(/\s*\n\s*/g, ""),
    meta: document.meta,
  };
}

type Answer = Response | (() => Response);
const answers = new Map<string, Answer>();
const requests: string[] = [];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const image =
  (bytes = PNG, type = "image/png") =>
  () =>
    new Response(bytes, { headers: { "content-type": type } });

beforeEach(() => {
  answers.clear();
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      requests.push(url);
      const answer = answers.get(url);
      if (!answer) return new Response("not found", { status: 404 });
      return typeof answer === "function" ? answer() : answer.clone();
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("::post", () => {
  it("draws the header, the text with its line breaks, and the counts in X's order", async () => {
    const { html, meta } = await render(
      '::post{url="https://x.com/jack/status/20" author="jack" handle="jack" time="2006-03-21T20:50:14Z" likes="324.6K" :replies="19263" views="1,234" reposts="3M"}\njust setting up my twttr\nsecond line\n::',
    );
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain(
      '<article class="csl" data-platform="x" data-comark-frame data-not-typeset aria-label="Post by jack on X">',
    );
    expect(html).toContain('<span class="csl-handle">@jack</span>');
    expect(html).toContain(
      '<time class="csl-time" datetime="2006-03-21T20:50:14Z" title="March 21, 2006 at 8:50 PM">Mar 21, 2006</time>',
    );
    expect(html).toContain(
      '<a class="csl-logo" href="https://x.com/jack/status/20" aria-label="View on X">',
    );
    expect(html).toMatch(/just setting up my twttr<br\s*\/?>second line/);
    const order = [...html.matchAll(/data-count="(\w+)"/g)].map((match) => match[1]);
    expect(order).toEqual(["replies", "reposts", "likes", "views"]);
    expect(html).toContain('title="324,600 likes"');
    expect(html).toContain('<span aria-hidden="true">19.3K</span>');
    expect(html).toContain('<span class="csl-sr">3,000,000 reposts</span>');
  });

  it("reads the platform from the address, and uses each platform's words and order", async () => {
    const cases: [string, string, string[]][] = [
      [
        "https://bsky.app/profile/ada.bsky.social/post/3lxyz",
        "bluesky",
        ["replies", "reposts", "likes"],
      ],
      [
        "https://mastodon.example/@ada/113000000000000001",
        "mastodon",
        ["replies", "reposts", "likes"],
      ],
      ["https://www.threads.com/@ada/post/C1", "threads", ["likes", "replies", "reposts"]],
      [
        "https://www.linkedin.com/posts/ada_activity-1",
        "linkedin",
        ["likes", "replies", "reposts"],
      ],
      ["https://blog.example/notes/1", "generic", ["replies", "reposts", "likes"]],
    ];
    for (const [url, platform, order] of cases) {
      const { html } = await render(
        `::post{url="${url}" author="Ada" likes="2" replies="1" reposts="3"}\nHi\n::`,
      );
      expect(html).toContain(`data-platform="${platform}"`);
      expect([...html.matchAll(/data-count="(\w+)"/g)].map((match) => match[1])).toEqual(order);
    }
    const { html } = await render(
      '::post{url="https://mastodon.example/@ada/1" author="Ada" reposts="1" likes="2"}\nHi\n::',
    );
    expect(html).toContain("1 boost");
    expect(html).toContain("2 favourites");
  });

  it("links mentions and tags to the platform, keeps written links, and moves pictures into the grid", async () => {
    const { html } = await render(
      '::post{platform="bluesky" author="Ada"}\nHi @grace.bsky.social, see #parsers and [the notes](https://example.com/n)\n\n![One](https://example.com/1.png)\n![Two](https://example.com/2.png)\n::',
    );
    expect(html).toContain(
      '<a href="https://bsky.app/profile/grace.bsky.social">@grace.bsky.social</a>',
    );
    expect(html).toContain('<a href="https://bsky.app/hashtag/parsers">#parsers</a>');
    expect(html).toContain('<a href="https://example.com/n">the notes</a>');
    expect(html).toMatch(
      /<div class="csl-media" data-count="2"><img src="https:\/\/example.com\/1.png" alt="One"\s*\/?><img src="https:\/\/example.com\/2.png" alt="Two"\s*\/?><\/div>/,
    );
  });

  it("draws a nested post as the quote, without counts", async () => {
    const { html } = await render(
      '::post{platform="x" author="Ada" likes="1"}\nThis.\n\n:::post{author="Grace" handle="grace" likes="50"}\nOriginal\n:::\n::',
    );
    expect(html).toContain(
      '<article class="csl" data-platform="x" data-quote aria-label="Post by Grace on X">',
    );
    const quote = html.slice(html.indexOf("data-quote"));
    expect(quote.slice(0, quote.indexOf("</article>"))).not.toContain("csl-counts");
    expect(quote.indexOf("Original")).toBeLessThan(quote.indexOf('data-count="likes"'));
  });

  it("shows the author's initial without an avatar, and the avatar with one", async () => {
    const plain = await render('::post{author="ada"}\nHi\n::');
    expect(plain.html).toContain('<span class="csl-avatar" aria-hidden="true">A</span>');
    expect(plain.html).toContain('<span class="csl-logo" role="img" aria-label="the web">');
    const pictured = await render(
      '::post{author="Ada" avatar="https://example.com/ada.png"}\nHi\n::',
    );
    expect(pictured.html).toMatch(
      /<img class="csl-avatar" src="https:\/\/example.com\/ada.png" alt="" width="40" height="40" data-zoom="false"/,
    );
    expect(requests).toEqual([]);
  });

  it("keeps links and mentions plain where comark-chips runs", async () => {
    const document = await parseMarkdown(
      '::post{url="https://x.com/ada/status/1" author="Ada" handle="ada"}\nThanks @grace, see https://example.com\n::\n\nAfter the card, @grace',
      { plugins: [social({ now: NOW }), chips({ download: false })] },
    );
    const html = await renderHtmlFromDocument(document, {
      components: { ...components, ...chipComponents },
    });
    expect(html.slice(0, html.indexOf("After the card"))).not.toContain('class="cp');
    expect(html).not.toContain("chip=");
    expect(html).toContain('<a href="https://x.com/grace">@grace</a>');
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(html).toContain('<span class="csl-handle">@ada</span>');
    expect(html).toContain('<a class="cp" href="https://github.com/grace"');
  });

  it("reports each problem, naming the block and the fix", async () => {
    const { meta, html } = await render(
      [
        '::post{platform="tiktok" author="Ada" likes="lots" time="yesterday" url="ftp://x" color="red"}\nHi\n:::post{author="A"}\nOne\n:::\n:::post{author="B"}\nTwo\n:::\n::',
        "::post\nNo one\n::",
        '::post{author="Ada" avatar="javascript:alert(1)"}\nHi\n::',
      ].join("\n\n"),
    );
    expect(meta.issues).toEqual([
      expect.stringMatching(/^`::post` 1: `color` isn't a prop of `::post`/),
      expect.stringMatching(
        /^`::post` 1: `url` is "ftp:\/\/x", which isn't an http or https address/,
      ),
      expect.stringMatching(
        /^`::post` 1: `platform` is "tiktok", which comark-social doesn't know/,
      ),
      expect.stringMatching(/^`::post` 1: `likes` is "lots", which isn't a count/),
      expect.stringMatching(/^`::post` 1: `time` is "yesterday", which isn't a date/),
      expect.stringMatching(/^`::post` 1 holds 2 `:::post` blocks/),
      expect.stringMatching(/^`::post` 4 has no `author` or `handle`/),
      expect.stringMatching(
        /^`::post` 5: `avatar` is "javascript:alert\(1\)", which isn't a picture's address/,
      ),
    ]);
    expect(Object.values(meta.issueRules ?? {})).toEqual([
      "comark/social/unknown-prop",
      "comark/social/invalid-url",
      "comark/social/unknown-platform",
      "comark/social/invalid-count",
      "comark/social/invalid-time",
      "comark/social/extra-quote",
      "comark/social/missing-author",
      "comark/social/invalid-url",
    ]);
    expect(html).toContain('<span class="csl-time">yesterday</span>');
    expect(html).toContain("One");
    expect(html).not.toContain("Two");
  });

  it("makes no request without the fetch option", async () => {
    await render('::post{url="https://x.com/ada/status/1856000000000000000"}\n::');
    expect(requests).toEqual([]);
  });
});

describe("::conversation", () => {
  const chat = [
    '::conversation{me="Ada" platform="x" request}',
    ':::message{from="Grace" avatar="/grace.png" time="2026-11-28T09:30:00Z"}',
    "Did it **ship**?",
    ":::",
    "",
    ':::message{from="Grace"}',
    "And the docs?",
    ":::",
    "",
    ':::message{from="Ada" time="2026-11-28"}',
    "It did.",
    ":::",
    "::",
  ].join("\n");

  it("draws the header, the request pill, and each side's messages", async () => {
    const { html, meta } = await render(chat);
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain(
      '<div class="csl-chat" role="group" data-platform="x" data-request data-comark-frame data-not-typeset aria-label="Conversation with Grace on X">',
    );
    expect(html).toContain(
      '<div class="csl-chat-head"><span class="csl-chat-title">Grace</span><span class="csl-request">Message request</span><span class="csl-logo" role="img" aria-label="X"></span></div>',
    );
    expect(html).toContain('<li class="csl-message" data-me="" data-start="" data-end="">');
    expect(html).toContain(
      '<div class="csl-bubble"><span class="csl-sr">Grace: </span><div class="csl-text"><p>Did it <strong>ship</strong>?</p></div></div>',
    );
    expect(html).toContain(
      '<time class="csl-time" datetime="2026-11-28T09:30:00Z" title="November 28, 2026 at 9:30 AM">Nov 28, 9:30 AM</time>',
    );
  });

  it("groups one sender's messages, with the avatar by the last", async () => {
    const { html } = await render(chat);
    expect(html).toContain('<li class="csl-message" data-start=""><div class="csl-body">');
    expect(html).toContain(
      '<li class="csl-message" data-end=""><img class="csl-avatar" src="/grace.png" alt="" width="32" height="32" data-zoom="false">',
    );
    expect(html).not.toContain("csl-from");
  });

  it("names each sender over their run in a group, and titles it", async () => {
    const { html } = await render(
      '::conversation{me="Ada"}\n:::message{from="Grace"}\nOne\n:::\n\n:::message{from="Linus"}\nTwo\n:::\n\n:::message{from="Linus"}\nThree\n:::\n::\n\n::conversation{title="Crew" platform="bluesky"}\n:::message{from="Ada"}\nHi\n:::\n::',
    );
    expect(html).toContain('aria-label="Conversation with Grace and Linus"');
    expect(html).toContain('<span class="csl-chat-title">Grace and Linus</span>');
    expect(html.match(/<span class="csl-from" aria-hidden="true">Linus<\/span>/g)).toHaveLength(1);
    expect(html).toContain('<span class="csl-avatar" aria-hidden="true">L</span>');
    expect(html).toContain('aria-label="Crew, a conversation on Bluesky"');
    expect(html).toContain('<span class="csl-chat-title">Crew</span>');
  });

  it("puts everyone on the left without me", async () => {
    const { html } = await render('::conversation\n:::message{from="Ada"}\nHi\n:::\n::');
    expect(html).not.toContain("data-me");
    expect(html).toContain('<span class="csl-avatar" aria-hidden="true">A</span>');
  });

  it("names the incoming sender at the start of each run when there is a custom title", async () => {
    const { html } = await render(chat.replace('platform="x"', 'title="Release chat"'));
    expect(html).toContain('<span class="csl-chat-title">Release chat</span>');
    expect(html.match(/<span class="csl-from" aria-hidden="true">Grace<\/span>/g)).toHaveLength(1);
    expect(html).not.toContain('<span class="csl-from" aria-hidden="true">Ada</span>');
  });

  it("validates offsetless message times in the same zone as the rendered timestamp", async () => {
    const markdown = '::conversation\n:::message{from="Ada" time="2026-03-08T02:30"}\nHi\n:::\n::';
    const gap = await render(markdown, { timeZone: "America/New_York" });
    expect(gap.html).toContain('<span class="csl-time">2026-03-08T02:30</span>');
    expect(Object.values(gap.meta.issueRules ?? {})).toEqual(["comark/social/invalid-time"]);
    const utc = await render(markdown, { timeZone: "UTC" });
    expect(utc.html).toContain('<time class="csl-time" datetime="2026-03-08T02:30:00Z"');
    expect(utc.meta.issues).toEqual([]);
  });

  it("reports each problem, naming the block and the fix", async () => {
    const { html, meta } = await render(
      '::conversation{me="Ada" color="red" platform="myspace"}\n:::message{from="Grace" avatar="javascript:alert(1)" time="soon"}\nHi\n:::\n\nStray words\n\n:::message\nWho?\n:::\n::\n\n::conversation{me="Ada"}\n::\n\nAfter',
    );
    expect(meta.issues).toEqual([
      "`::conversation` 1: `color` isn't a prop of `::conversation`, so it's ignored. Use `me`, `platform`, `title`, or `request`.",
      '`::conversation` 1: `platform` is "myspace", which comark-social doesn\'t know, so the conversation shows a globe for its logo. Write `x`, `bluesky`, `mastodon`, `threads`, `linkedin`, or `generic`, or leave it out.',
      "`::conversation` 1, message 1: `avatar` is \"javascript:alert(1)\", which isn't a picture's address, so the message shows the sender's initial. Write an https address, a path, or a `data:image/` URI.",
      '`::conversation` 1, message 1: `time` is "soon", which isn\'t a date, so it shows as written. Write an ISO date such as 2026-11-28 or 2026-11-28T09:30:00Z.',
      '`::conversation` 1, message 2 has no `from`, so it shows on the left with no name. Write who sent it, such as `from="Ada"`.',
      "`::conversation` 1 holds a `p` outside its messages, and a conversation draws only its `:::message` blocks, so it's left out. Put the words in a `:::message`, or move them out of the conversation.",
      '`::conversation` 2 holds no `:::message`, so nothing shows. Write a `:::message{from="…"}` for each message.',
    ]);
    expect(Object.values(meta.issueRules ?? {})).toEqual([
      "comark/social/unknown-prop",
      "comark/social/unknown-platform",
      "comark/social/invalid-url",
      "comark/social/invalid-time",
      "comark/social/missing-sender",
      "comark/social/conversation-content",
      "comark/social/empty-conversation",
    ]);
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Stray words");
    expect(html).toContain('<span class="csl-avatar" aria-hidden="true">?</span>');
    expect(html.match(/class="csl-chat"/g)).toHaveLength(1);
    expect(html).toContain("<p>After</p>");
  });
});

describe("fetch", () => {
  it("keeps non-allowlisted status and image destinations off the default transport", async () => {
    await expect(fetchPost("https://mastodon.example/@ada/123")).rejects.toThrow(
      "require a host-provided request transport",
    );
    const { meta } = await render(
      '::post{url="https://x.com/ada/status/405" author="Ada" avatar="https://images.example/ada.png"}\n::',
      { fetch: true },
    );
    expect(requests).toEqual(["https://api.fxtwitter.com/i/status/405"]);
    expect(meta.issues?.join(" ")).toContain("require a host-provided request transport");
  });

  it("checks each redirect against the same outbound policy", async () => {
    const api = "https://api.fxtwitter.com/i/status/406";
    const cdn = "https://pbs.twimg.com/redirect.png";
    const other = "https://other.example/image.png";
    const redirect = new Response(null, { status: 302, headers: { location: other } });
    answers.set(api, redirect);
    answers.set(cdn, redirect);
    await render(`::post{url="https://x.com/ada/status/406" author="Ada" avatar="${cdn}"}\n::`, {
      fetch: true,
    });
    expect(requests).toEqual([api, cdn]);
    const transport = vi.fn(async (url: URL, init: RequestInit) => {
      expect(init.redirect).toBe("manual");
      if (url.href === other) throw new Error("blocked by host policy");
      return redirect.clone();
    });
    await expect(fetchPost("https://x.com/ada/status/406", { request: transport })).rejects.toThrow(
      "blocked by host policy",
    );
    expect(transport.mock.calls.map(([url]) => url.href)).toEqual([api, other]);
  });

  it("reports a malformed written avatar without rejecting the parse", async () => {
    const { html, meta } = await render(
      '::post{url="https://x.com/ada/status/407" author="Ada" avatar="https://"}\n::',
      { fetch: true },
    );
    expect(html).toContain('<span class="csl-avatar" aria-hidden="true">A</span>');
    expect(Object.values(meta.issueRules ?? {})).toContain("comark/social/invalid-url");
    expect(requests).toEqual(["https://api.fxtwitter.com/i/status/407"]);
  });

  it("completes and validates authored quotes independently of the parent", async () => {
    const api = "https://api.fxtwitter.com/i/status/408";
    answers.set(api, json(await fixture("fxtwitter")));
    const { html, meta } = await render(
      '::post{author="Parent"}\n:::post{url="https://x.com/ada/status/408" author="Written quote"}\n:::\n::\n\n::post{author="Other parent"}\n:::post\nAnonymous\n:::\n::',
      { fetch: true },
    );
    expect(html).toContain('data-quote aria-label="Post by Written quote on X"');
    expect(html).toContain("Shipped the new parser");
    expect(html).not.toContain("Grace Hopper");
    expect(meta.issues).toContainEqual(expect.stringMatching(/^`::post` 4 has no `author`/));
    expect(requests).toContain(api);
  });

  it("inlines a URL-less written quote's avatar after fetching its parent, but not its body images", async () => {
    const api = "https://api.fxtwitter.com/i/status/410";
    const avatar = "https://pbs.twimg.com/written-quote.png";
    const picture = "https://pbs.twimg.com/written-quote-picture.png";
    answers.set(api, json({ tweet: { author: { name: "Ada" }, text: "Fetched parent" } }));
    answers.set(avatar, image());
    const { html, meta } = await render(
      `::post{url="https://x.com/ada/status/410"}\n:::post{author="Grace" avatar="${avatar}"}\n![Written picture](${picture})\n:::\n::`,
      { fetch: true },
    );
    expect(requests).toEqual([api, avatar]);
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain('data-quote aria-label="Post by Grace on X"');
    expect(html).toContain('<img class="csl-avatar" src="data:image/png;base64,iVBORw0KGgo="');
    expect(html).toContain(`<img src="${picture}"`);
  });

  it("limits written and fetched media to four before rendering or downloading", async () => {
    const written = Array.from({ length: 5 }, (_, index) => `![Image](${index}.png)`).join(" ");
    const original = JSON.stringify(await fixture("fxtwitter"));
    const fetched = JSON.parse(original) as { tweet: { media: { photos: { url: string }[] } } };
    fetched.tweet.media.photos = Array.from({ length: 5 }, (_, index) => ({
      url: `https://pbs.twimg.com/grid-${index}.png`,
    }));
    answers.set("https://api.fxtwitter.com/i/status/409", json(fetched));
    const { html } = await render(
      `::post{author="Ada"}\n${written}\n::\n\n::post{url="https://x.com/ada/status/409"}\n::`,
      { fetch: true },
    );
    expect(html.match(/<img src=/g)).toHaveLength(8);
    expect(requests.filter((url) => url.includes("/grid-"))).toHaveLength(4);
    expect(requests).not.toContain("https://pbs.twimg.com/grid-4.png");
  });

  it("fills an X post from fxtwitter and inlines its avatar and pictures, with what's written winning", async () => {
    answers.set(
      "https://api.fxtwitter.com/i/status/1856000000000000000",
      json(await fixture("fxtwitter")),
    );
    for (const url of [
      "https://pbs.twimg.com/ada_200x200.jpg",
      "https://pbs.twimg.com/chart.png",
      "https://pbs.twimg.com/grace_200x200.jpg",
    ])
      answers.set(url, image());
    const { html, meta } = await render(
      '::post{url="https://x.com/ada/status/1856000000000000000" likes="2K"}\n::',
      { fetch: true },
    );
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain('<span class="csl-name">Ada Lovelace</span>');
    expect(html).toContain('<span class="csl-handle">@ada</span>');
    expect(html).toContain('<img class="csl-avatar" src="data:image/png;base64,iVBORw0KGgo="');
    expect(html).toMatch(
      /Shipped the new parser today 🎉<br\s*\/?>It reads 2x faster, thanks <a href="https:\/\/x.com\/grace">@grace<\/a><\/p><p><a href="https:\/\/example.com\/blog\/parser">example.com\/blog\/parser<\/a> <a href="https:\/\/x.com\/hashtag\/compilers">#compilers<\/a><\/p>/,
    );
    expect(html).not.toContain("t.co");
    expect(html).toContain(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Parse time before and after" width="1200" height="675"',
    );
    expect(html).toContain('data-quote aria-label="Post by Grace Hopper on X"');
    expect(html).toContain('<span class="csl-sr">2,000 likes</span>');
    expect(html).toContain('<span class="csl-sr">34 reposts</span>');
    expect(html).toContain('<span class="csl-sr">98,765 views</span>');
  });

  it("fills a Bluesky post, resolving the handle and putting full links back", async () => {
    answers.set(
      "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=ada.bsky.social",
      json({ did: "did:plc:abc123" }),
    );
    answers.set(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent("at://did:plc:abc123/app.bsky.feed.post/3lxyz")}`,
      json(await fixture("bluesky")),
    );
    for (const url of [
      "https://cdn.bsky.app/ada.jpg",
      "https://cdn.bsky.app/f1.jpg",
      "https://cdn.bsky.app/f2.jpg",
    ])
      answers.set(url, image());
    const post = await fetchPost("https://bsky.app/profile/ada.bsky.social/post/3lxyz");
    expect(post).toMatchObject({
      platform: "bluesky",
      url: "https://bsky.app/profile/ada.bsky.social/post/3lxyz",
      author: "Ada",
      handle: "@ada.bsky.social",
      time: "2026-11-12T10:24:00.000Z",
      text: "Read the notes at https://example.com/notes/2026/parser and say hi",
      counts: { replies: 3, reposts: 7, likes: 40 },
    });
    const { html, meta } = await render(
      '::post{url="https://bsky.app/profile/ada.bsky.social/post/3lxyz"}\n::',
      { fetch: true },
    );
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain('data-platform="bluesky"');
    expect(html).toContain(
      '<a href="https://example.com/notes/2026/parser">example.com/notes/2026/parser</a>',
    );
    expect(html).toContain('<div class="csl-media" data-count="2">');
  });

  it("inlines an official Bluesky video thumbnail after its CDN redirect", async () => {
    const uri = "at://did:plc:abc123/app.bsky.feed.post/video";
    const api = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`;
    const thumbnail = "https://video.bsky.app/watch/did:plc:abc123/video/thumbnail.jpg";
    const cdn = "https://video.cdn.bsky.app/watch/did:plc:abc123/video/thumbnail.jpg";
    answers.set(
      api,
      json({
        posts: [
          {
            uri,
            author: { handle: "ada.bsky.social", displayName: "Ada" },
            record: { text: "A video" },
            embed: { $type: "app.bsky.embed.video#view", thumbnail, alt: "A video still" },
          },
        ],
      }),
    );
    answers.set(thumbnail, new Response(null, { status: 302, headers: { location: cdn } }));
    answers.set(cdn, image(new Uint8Array([255, 216, 255, 217]), "image/jpeg"));
    const { html, meta } = await render(
      '::post{url="https://bsky.app/profile/did:plc:abc123/post/video"}\n::',
      { fetch: true },
    );
    expect(requests).toEqual([api, thumbnail, cdn]);
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain('<img src="data:image/jpeg;base64,/9j/2Q==" alt="A video still"');
  });

  it("fills a Mastodon post from its server, reading its HTML into text", async () => {
    answers.set(
      "https://mastodon.example/api/v1/statuses/113000000000000001",
      json(await fixture("mastodon")),
    );
    answers.set("https://mastodon.example/ada.png", image());
    answers.set("https://mastodon.example/v.jpg", image());
    const request = (url: URL, init: RequestInit) => fetch(url, init);
    const post = await fetchPost("https://mastodon.example/@ada/113000000000000001", { request });
    expect(post.text).toBe(
      "Hello @grace@other.example & friends\n\nNew post: https://example.com/a/very/long/path/to/a/post #rust",
    );
    expect(post.handle).toBe("@ada@mastodon.example");
    const { html } = await render(
      '::post{url="https://mastodon.example/@ada/113000000000000001"}\n::',
      {
        fetch: true,
        request,
      },
    );
    expect(html).toContain('<a href="https://other.example/@grace">@grace@other.example</a>');
    expect(html).toContain('<a href="https://mastodon.example/tags/rust">#rust</a>');
    expect(html).toContain(
      '<a href="https://example.com/a/very/long/path/to/a/post">example.com/a/very/long/path/…</a>',
    );
    expect(html).toContain(
      '<span class="csl-video"><img src="data:image/png;base64,iVBORw0KGgo=" alt="A demo"',
    );
  });

  it("keeps a picture past the size cap at its address, with an issue", async () => {
    answers.set(
      "https://api.fxtwitter.com/i/status/1856000000000000000",
      json(await fixture("fxtwitter")),
    );
    answers.set("https://pbs.twimg.com/ada_200x200.jpg", image());
    answers.set("https://pbs.twimg.com/grace_200x200.jpg", image());
    answers.set("https://pbs.twimg.com/chart.png", image(new Uint8Array(2000)));
    const { html, meta } = await render(
      '::post{url="https://x.com/ada/status/1856000000000000000"}\n::',
      { fetch: true, maxImageSize: 1000 },
    );
    expect(html).toContain('<img src="https://pbs.twimg.com/chart.png"');
    expect(meta.issues).toEqual([
      expect.stringMatching(
        /^`::post` 1: the picture at https:\/\/pbs.twimg.com\/chart.png is larger than 1 KB/,
      ),
    ]);
    expect(meta.issueRules?.[meta.issues![0]!]).toBe("comark/social/large-media");
  });

  it("renders what's written when the fetch fails, with an issue", async () => {
    const { html, meta } = await render(
      '::post{url="https://x.com/ada/status/999" author="Ada"}\nWritten\n::',
      { fetch: true },
    );
    expect(html).toContain("Written");
    expect(meta.issues).toEqual([
      expect.stringMatching(
        /^`::post` 1: fetching https:\/\/x.com\/ada\/status\/999 from X failed \(the post doesn't exist or isn't public\)/,
      ),
    ]);
    expect(meta.issueRules?.[meta.issues![0]!]).toBe("comark/social/fetch-failed");
  });

  it("doesn't fetch Threads, LinkedIn, or other sites", async () => {
    const { meta } = await render(
      '::post{url="https://www.threads.com/@ada/post/C1" author="Ada"}\nHi\n::',
      { fetch: true },
    );
    expect(requests).toEqual([]);
    expect(meta.issues ?? []).toEqual([]);
    await expect(fetchPost("https://www.linkedin.com/posts/1")).rejects.toThrow(
      "LinkedIn has no public API",
    );
  });
});

const reply = (n: number, extra = "") =>
  `:::post{url="https://x.com/ada/status/${n}" author="Ada" handle="ada" time="2026-11-20T09:3${n}:00Z"${extra}}\nPost ${n}\n:::`;
const thread = (count: number, props = "") =>
  `::thread${props}\n${Array.from({ length: count }, (_, i) => reply(i + 1, i + 1 === count ? ' views="9.1K" likes="12"' : "")).join("\n\n")}\n::`;

describe("::thread", () => {
  it("draws its posts as rows of one card, joined by a rail, with the last one focal", async () => {
    const { html, meta } = await render(thread(3));
    expect(meta.issues ?? []).toEqual([]);
    expect(html).toContain(
      '<div class="csl-thread" role="group" data-platform="x" data-comark-frame data-not-typeset aria-label="Thread of 3 posts on X"><a class="csl-logo" href="https://x.com/ada/status/3" aria-label="View on X"></a>',
    );
    expect(
      html.match(/<article class="csl" data-platform="x" data-thread data-rail aria-label/g),
    ).toHaveLength(2);
    expect(html).toContain(
      '<article class="csl" data-platform="x" data-thread data-focal aria-label',
    );
    expect(html).not.toMatch(/data-thread[^>]*data-comark-frame/);
    // A row's date links to its post; the focal post shows its full date and views instead.
    expect(html).toContain(
      '<a class="csl-link" href="https://x.com/ada/status/1"><time class="csl-time" datetime="2026-11-20T09:31:00Z"',
    );
    expect(html).toContain(
      '<div class="csl-stamp"><a class="csl-link" href="https://x.com/ada/status/3"><time class="csl-time" datetime="2026-11-20T09:33:00Z">November 20, 2026 at 9:33 AM</time></a><span class="csl-views"><span class="csl-number">9.1K</span> views</span></div>',
    );
    expect(html).not.toContain('data-count="views"');
    expect(html.match(/class="csl-logo"/g)).toHaveLength(1);
  });

  it("draws the last post like the others with focal set to false", async () => {
    const { html } = await render(thread(2, '{:focal="false"}'));
    expect(html).not.toContain("data-focal");
    expect(html).not.toContain("csl-stamp");
    expect(html).toContain('<span class="csl-sr">9,100 views</span>');
  });

  it("folds the posts above the one the last replies to once more than five come before it", async () => {
    const short = await render(thread(6));
    expect(short.html).not.toContain("<details");
    const { html } = await render(thread(8));
    expect(html).toContain(
      '<details class="csl-earlier"><summary><span class="csl-closed">Show</span><span class="csl-opened">Hide</span> 6 earlier posts</summary>',
    );
    const folded = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
    expect(folded).toContain("Post 6");
    expect(folded).not.toContain("Post 7");
    expect(html.slice(html.indexOf("</details>"))).toContain("Post 7");
  });

  it("links a row with no date to its post, and draws a quote in a row as a quote", async () => {
    const { html } = await render(
      `::thread\n:::post{url="https://x.com/ada/status/1" author="Ada" handle="ada"}\nFirst\n\n::::post{author="Grace" handle="grace"}\nQuoted\n::::\n:::\n\n:::post{url="https://x.com/ada/status/2" author="Ada" handle="ada"}\nLast\n:::\n::`,
    );
    expect(html).toContain('<a class="csl-link" href="https://x.com/ada/status/1">View post</a>');
    expect(html).toContain(
      '<div class="csl-stamp"><a class="csl-link" href="https://x.com/ada/status/2">View post</a></div>',
    );
    expect(html).toMatch(/<article class="csl" data-platform="x" data-quote aria-label/);
    expect(html.match(/data-rail/g)).toHaveLength(1);
  });

  it("numbers a post after a thread by every post before it, rows included", async () => {
    const { meta } = await render(`${thread(1)}\n\n::post{platform="x"}\nNo one\n::`);
    expect(meta.issues).toEqual([expect.stringMatching(/^`::post` 2 has no `author`/)]);
  });

  it("gives the posts that name no platform the thread's", async () => {
    const written = await render(
      '::thread\n:::post{url="https://bsky.app/profile/ada.dev/post/1" author="Ada" handle="ada.dev"}\nFirst\n:::\n\n:::post{author="Grace" handle="grace.dev"}\nSecond\n:::\n::',
    );
    expect(written.html.match(/<article class="csl" data-platform="bluesky"/g)).toHaveLength(2);
    expect(written.html).toContain('<span class="csl-handle">@grace.dev</span>');
    const fetched = await render(
      '::thread{url="https://x.com/ada/status/2"}\n:::post{author="Ada"}\nOne\n:::\n::',
    );
    expect(fetched.html).toContain('<article class="csl" data-platform="x"');
  });

  it("reports what's outside its posts, and a thread with none", async () => {
    const { html, meta } = await render(
      `::thread\nA note\n\n${reply(1)}\n::\n\n::thread\n::\n\n::post{author="Ada"}\nAfter\n::`,
    );
    expect(html).not.toContain("A note");
    expect(html.match(/csl-thread/g)).toHaveLength(1);
    expect(html).toContain("After");
    expect(meta.issues).toEqual([
      "`::thread` 1 holds a `p` outside its posts, and a thread draws only its `:::post` blocks, so it's left out. Put the words in a `:::post`, or move them out of the thread.",
      "`::thread` 2 holds no `:::post`, so nothing shows. Write a `:::post` for each post, or give it the last post's `url` and turn on the `fetch` option.",
    ]);
    expect(Object.values(meta.issueRules ?? {})).toEqual([
      "comark/social/thread-content",
      "comark/social/empty-thread",
    ]);
  });

  it("names each post in its issues by the thread", async () => {
    const { meta } = await render('::thread\n:::post{platform="x" likes="lots"}\nHi\n:::\n::');
    expect(meta.issues).toEqual([
      expect.stringMatching(/^`::thread` 1, post 1: `likes` is "lots"/),
      expect.stringMatching(/^`::thread` 1, post 1 has no `author` or `handle`/),
    ]);
  });

  it("fetches a thread from its last post up to the root, five posts at most", async () => {
    const status = (id: number, parent?: number) =>
      json({
        id: String(id),
        created_at: "2026-11-10T08:00:00.000Z",
        in_reply_to_id: parent ? String(parent) : null,
        url: `https://mastodon.example/@ada/${id}`,
        content: `<p>Toot ${id}</p>`,
        account: { acct: "ada", username: "ada", display_name: "Ada" },
        media_attachments: [],
      });
    for (let id = 701; id <= 707; id++)
      answers.set(
        `https://mastodon.example/api/v1/statuses/${id}`,
        status(id, id > 701 ? id - 1 : undefined),
      );
    const { html, meta } = await render('::thread{url="https://mastodon.example/@ada/707"}\n::', {
      fetch: true,
      request: (url: URL, init: RequestInit) => fetch(url, init),
    });
    expect(meta.issues ?? []).toEqual([]);
    expect(requests).toHaveLength(5);
    expect(html).not.toContain("Toot 702");
    expect(html.indexOf("Toot 703")).toBeLessThan(html.indexOf("Toot 707"));
    expect(html).toContain('aria-label="Thread of 5 posts on Mastodon"');
  });

  it("starts after a post it couldn't fetch, with an issue", async () => {
    answers.set(
      "https://mastodon.example/api/v1/statuses/802",
      json({
        id: "802",
        in_reply_to_id: "801",
        url: "https://mastodon.example/@ada/802",
        content: "<p>Only me</p>",
        account: { acct: "ada", display_name: "Ada" },
      }),
    );
    const { html, meta } = await render('::thread{url="https://mastodon.example/@ada/802"}\n::', {
      fetch: true,
      request: (url: URL, init: RequestInit) => fetch(url, init),
    });
    expect(html).toContain("Only me");
    expect(meta.issues).toEqual([
      expect.stringMatching(
        /^`::thread` 1: fetching the post at https:\/\/mastodon.example\/@ada\/801, which the thread replies to, failed .*so the thread starts after it\./,
      ),
    ]);
  });

  it("doesn't fetch the url when its posts are written", async () => {
    await render(`::thread{url="https://mastodon.example/@ada/1"}\n${reply(1)}\n::`, {
      fetch: true,
    });
    expect(requests.filter((url) => url.includes("mastodon"))).toEqual([]);
  });
});
