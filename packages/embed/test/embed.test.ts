import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import embed, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [embed()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [embed()] })).meta.issues;
const block = (url: string, props = "") => `::embed{url="${url}"${props}}\n::`;
const iframe = async (url: string, props = "") =>
  /<iframe src="([^"]*)"/.exec(await render(block(url, props)))?.[1];

describe("comark-embed", () => {
  it("renders a player with its link under it, and inlines the styles once", async () => {
    const html = await render(
      `${block("https://www.youtube.com/watch?v=dQw4w9WgXcQ", ' title="Launch demo"')}\n\n${block("https://vimeo.com/76979871")}`,
    );
    expect(html).toContain(
      '<figure class="ce" data-provider="youtube" data-size="video"><div class="ce-frame">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Launch demo" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
        '<figcaption><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Launch demo<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg></a></figcaption></figure>',
    );
    // Without a title, the player is named after its provider and the link after its host.
    expect(html).toContain('title="Vimeo video"');
    expect(html).toContain('<figcaption><a href="https://vimeo.com/76979871">vimeo.com<svg');
    expect(html.match(/<style data-comark-embed>/g)).toHaveLength(1);
  });

  it("reads YouTube watch, youtu.be, shorts, embed, and live links, with a start time", async () => {
    const src = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ])
      expect(await iframe(url), url).toBe(src);
    expect(await iframe("https://youtu.be/dQw4w9WgXcQ", " start=90")).toBe(`${src}?start=90`);
    expect(await iframe("https://youtu.be/dQw4w9WgXcQ?t=1m30s")).toBe(`${src}?start=90`);
    // The block's own `start` wins over the link's.
    expect(await iframe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5", " start=7")).toBe(
      `${src}?start=7`,
    );
    const short = await render(block("https://www.youtube.com/shorts/dQw4w9WgXcQ"));
    expect(short).toContain('data-provider="youtube" data-size="short"');
  });

  it("sizes apps, Shorts, and X posts from their variables", async () => {
    const html = await render(block("https://www.youtube.com/shorts/dQw4w9WgXcQ"));
    expect(html).toContain(
      ":where(.ce){--ce-app-height:30rem;--ce-short-width:20rem;--ce-post-width:550px;--ce-post-height:30rem}",
    );
    expect(html).toContain(
      ".ce[data-size='short'] .ce-frame{aspect-ratio:9/16;max-width:var(--ce-short-width);",
    );
    expect(html).toContain(".ce[data-size='app'] .ce-frame{height:var(--ce-app-height)}");
    expect(html).toContain(
      ".ce[data-size='post'] .ce-frame{max-width:var(--ce-post-width);margin-inline:auto;",
    );
    expect(html).toContain(".ce[data-size='post'] iframe{height:var(--ce-post-height)}");
  });

  it("reads Vimeo links, unlisted ones too, without tracking", async () => {
    expect(await iframe("https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
    expect(await iframe("https://vimeo.com/76979871/a1b2c3d4e5", " start=30")).toBe(
      "https://player.vimeo.com/video/76979871?h=a1b2c3d4e5&amp;dnt=1#t=30s",
    );
    expect(await iframe("https://player.vimeo.com/video/76979871?h=a1b2c3d4e5")).toBe(
      "https://player.vimeo.com/video/76979871?h=a1b2c3d4e5&amp;dnt=1",
    );
    expect(await iframe("https://vimeo.com/channels/staffpicks/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
  });

  it("reads Loom share links", async () => {
    const src = "https://www.loom.com/embed/e5b8c04bca094dd8a5507925ab887002";
    expect(await iframe("https://www.loom.com/share/e5b8c04bca094dd8a5507925ab887002?sid=1")).toBe(
      src,
    );
    expect(
      await iframe("https://loom.com/share/Release-notes-e5b8c04bca094dd8a5507925ab887002"),
    ).toBe(src);
    expect(await iframe("https://www.loom.com/embed/e5b8c04bca094dd8a5507925ab887002")).toBe(src);
  });

  it("reads Spotify links, compact for a track or an episode", async () => {
    for (const [type, size] of [
      ["track", "compact"],
      ["episode", "compact"],
      ["album", "list"],
      ["playlist", "list"],
      ["show", "list"],
    ]) {
      const html = await render(
        block(`https://open.spotify.com/${type}/4uLU6hMCjMI75M1A2tKUQC?si=x`),
      );
      expect(html).toContain(
        `data-provider="spotify" data-size="${size}"><div class="ce-frame"><iframe src="https://open.spotify.com/embed/${type}/4uLU6hMCjMI75M1A2tKUQC" title="Spotify ${type}"`,
      );
    }
    expect(await iframe("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC")).toBe(
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
  });

  it("reads CodePen, StackBlitz, and Figma links", async () => {
    expect(await iframe("https://codepen.io/chriscoyier/pen/gfdDu")).toBe(
      "https://codepen.io/chriscoyier/embed/gfdDu",
    );
    expect(await iframe("https://stackblitz.com/edit/vitejs-vite?file=index.html")).toBe(
      "https://stackblitz.com/edit/vitejs-vite?file=index.html&amp;embed=1",
    );
    expect(await iframe("https://stackblitz.com/github/vitejs/vite")).toBe(
      "https://stackblitz.com/github/vitejs/vite?embed=1",
    );
    expect(await iframe("https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Example?node-id=0-3")).toBe(
      "https://embed.figma.com/design/BAZsTPbh6W1r66Bdo?node-id=0-3&amp;embed-host=comark",
    );
    expect(await iframe("https://www.figma.com/file/BAZsTPbh6W1r66Bdo/Example")).toBe(
      "https://embed.figma.com/design/BAZsTPbh6W1r66Bdo?embed-host=comark",
    );
    expect(await iframe("https://www.figma.com/proto/BAZsTPbh6W1r66Bdo/Example")).toBe(
      "https://embed.figma.com/proto/BAZsTPbh6W1r66Bdo?embed-host=comark",
    );
    expect(await render(block("https://codepen.io/chriscoyier/pen/gfdDu"))).toContain(
      'data-provider="codepen" data-size="app"',
    );
  });

  it("reads X and Twitter post links into X's player, sized by a script inlined once", async () => {
    const src = "https://platform.twitter.com/embed/Tweet.html?id=2116191062418997278&amp;dnt=true";
    for (const url of [
      "https://x.com/_onmax/status/2116191062418997278",
      "https://twitter.com/_onmax/status/2116191062418997278/",
      "https://www.twitter.com/_onmax/status/2116191062418997278?s=20&t=abc",
      "https://mobile.x.com/_onmax/status/2116191062418997278",
      "https://mobile.twitter.com/_onmax/statuses/2116191062418997278",
      "https://x.com/_onmax/status/2116191062418997278/video/1",
      "https://x.com/_onmax/status/2116191062418997278/photo/2",
      "https://x.com/i/web/status/2116191062418997278",
    ]) {
      expect(await iframe(url), url).toBe(src);
      expect(await issues(block(url)), url).toEqual([]);
    }
    const post = block("https://x.com/_onmax/status/2116191062418997278");
    const html = await render(`${post}\n\n${post}`);
    expect(html).toContain('<figure class="ce" data-provider="x" data-size="post">');
    expect(html).toContain('title="X post"');
    expect(html).toContain(
      '<figcaption><a href="https://x.com/_onmax/status/2116191062418997278">x.com<svg',
    );
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain("twttr.private.resize");
    // Other players need no script.
    expect(await render(block("https://youtu.be/dQw4w9WgXcQ"))).not.toContain("<script>");
  });

  it("accepts the documented provider shapes and rejects malformed StackBlitz paths", async () => {
    const players = [
      ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      ["vimeo", "https://player.vimeo.com/video/76979871"],
      ["loom", "https://www.loom.com/embed/e5b8c04bca094dd8a5507925ab887002"],
      ["spotify", "https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF"],
      ["codepen", "https://codepen.io/chriscoyier/details/gfdDu"],
      ["stackblitz", "https://stackblitz.com/edit/vitejs-vite/"],
      ["figma", "https://www.figma.com/file/BAZsTPbh6W1r66Bdo/Example"],
      ["x", "https://twitter.com/_onmax/status/2116191062418997278"],
    ] as const;
    for (const [provider, url] of players) {
      expect(await issues(block(url)), url).toEqual([]);
      expect(await render(block(url)), url).toContain(`data-provider="${provider}"`);
    }

    for (const url of [
      "https://stackblitz.com/github/vitejs/vite/tree/main",
      "https://stackblitz.com/github/remix-run/react-router/tree/main/examples/basic",
      "https://stackblitz.com/github/owner/repo/tree/feature%2Fbranch/my%20app",
    ]) {
      expect(await issues(block(url)), url).toEqual([]);
      expect(await render(block(url)), url).toContain('data-provider="stackblitz"');
    }

    for (const url of [
      "https://stackblitz.com/edit/vitejs-vite/extra",
      "https://stackblitz.com/github/vitejs/vite//tree/main",
      "https://stackblitz.com/github/vitejs",
    ]) {
      expect(await issues(block(url)), url).toEqual([
        `\`::embed\` 1: can't read a project from ${url}. Use a stackblitz.com/edit/<project> or stackblitz.com/github/<owner>/<repo>[/<path>] link.`,
      ]);
      const html = await render(block(url));
      expect(html, url).toContain('class="ce-card"');
      expect(html, url).not.toContain('data-provider="stackblitz"');
    }
  });

  it("renders any other https link as a card, and escapes what it prints", async () => {
    // The space keeps the title and host apart where the styles don't load, such as a feed reader.
    expect(await render(block("https://example.com/docs", ' title="Setup guide"'))).toContain(
      '<a class="ce-card" href="https://example.com/docs"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"></path></svg>' +
        "<strong>Setup guide</strong> <span>example.com</span></a>",
    );
    expect(await render(block("https://example.com/"))).toContain(
      "<strong>example.com</strong> <span>example.com</span>",
    );
    // A provider's link with no ID in it is still worth following.
    expect(await render(block("https://www.youtube.com/@vitejs"))).toMatch(
      /<a class="ce-card" href="https:\/\/www\.youtube\.com\/@vitejs"><svg [^>]*>.*?<\/svg><strong>youtube\.com<\/strong>/,
    );
    const html = await render(block("https://example.com/?q=%22x%22", " title='<b>\"Hi\"</b>'"));
    expect(html).toContain("<strong>&lt;b&gt;&quot;Hi&quot;&lt;/b&gt;</strong>");
    expect(html).not.toContain("<b>");
  });

  it("renders nothing for a missing or unsafe link", async () => {
    for (const markdown of [
      "::embed\n::",
      block("javascript:alert(1)"),
      block("http://example.com"),
      block("https://alice:secret@example.com/"),
      block("not a url"),
    ]) {
      const html = await render(`Before\n\n${markdown}\n\nAfter`);
      expect(html, markdown).not.toMatch(/ce-card|<figure|<iframe|alert|example\.com/);
      expect(html, markdown).toContain("After");
    }
  });

  it("reads bound props and drops {#id .class}", async () => {
    const html = await render(
      '---\nvideo: https://youtu.be/dQw4w9WgXcQ\n---\n::embed{:url="frontmatter.video" #demo .wide}\n::',
    );
    expect(html).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).not.toMatch(/demo|wide/);
  });

  it("reports every problem in meta.issues, naming the block and the fix", async () => {
    expect(
      await issues(
        `${block("https://youtu.be/dQw4w9WgXcQ", " start=90")}\n\n${block("https://example.com", ' title="Docs"')}`,
      ),
    ).toEqual([]);
    expect(await issues("::embed\n::")).toEqual([
      '`::embed` 1: `url` is required. Write `::embed{url="https://..."}`.',
    ]);
    expect(
      await issues(`${block("https://youtu.be/dQw4w9WgXcQ")}\n\n${block("javascript:alert(1)")}`),
    ).toEqual(["`::embed` 2: `url` must start with https://."]);
    expect(await issues(block("http://example.com"))).toEqual([
      "`::embed` 1: `url` must start with https://.",
    ]);
    expect(await issues(block("https://alice:secret@www.youtube.com/watch?v=dQw4w9WgXcQ"))).toEqual(
      [
        "`::embed` 1: `url` has a user name or password before the host. Remove the part up to and including `@`.",
      ],
    );
    expect(await issues(block("https://vimeo.com/76979871?h=%26dnt%3D0"))).toEqual([
      "`::embed` 1: can't read a video ID from https://vimeo.com/76979871?h=%26dnt%3D0. The `h` hash of an unlisted video is letters a to f and digits only.",
    ]);
    expect(await issues(block("https://youtu.be/dQw4w9WgXcQ", " start=9007199254740993"))).toEqual([
      "`::embed` 1: `start` must be a whole number of seconds, such as `start=90`.",
    ]);
    expect(await issues(block("https://www.youtube.com/watch?v=short"))).toEqual([
      "`::embed` 1: can't read a video ID from https://www.youtube.com/watch?v=short. Use a youtube.com/watch, youtu.be, or /shorts/ link.",
    ]);
    expect(await issues(block("https://vimeo.com/staff"))).toEqual([
      "`::embed` 1: can't read a video ID from https://vimeo.com/staff. Use a vimeo.com/<number> link.",
    ]);
    expect(await issues(block("https://www.loom.com/looms/videos"))).toEqual([
      "`::embed` 1: can't read a video ID from https://www.loom.com/looms/videos. Use a loom.com/share/<id> link.",
    ]);
    expect(await issues(block("https://open.spotify.com/user/spotify"))).toEqual([
      "`::embed` 1: can't read a track, album, playlist, episode, show, or artist from https://open.spotify.com/user/spotify. Use an open.spotify.com/track, album, playlist, episode, show, or artist link.",
    ]);
    expect(await issues(block("https://codepen.io/chriscoyier"))).toEqual([
      "`::embed` 1: can't read a pen from https://codepen.io/chriscoyier. Use a codepen.io/<user>/pen/<id> link.",
    ]);
    expect(await issues(block("https://stackblitz.com/"))).toEqual([
      "`::embed` 1: can't read a project from https://stackblitz.com/. Use a stackblitz.com/edit/<project> or stackblitz.com/github/<owner>/<repo>[/<path>] link.",
    ]);
    expect(await issues(block("https://www.figma.com/files/recents"))).toEqual([
      "`::embed` 1: can't read a file from https://www.figma.com/files/recents. Use a figma.com/design, proto, board, slides, or deck link.",
    ]);
    for (const url of [
      "https://x.com/_onmax",
      "https://x.com/_onmax/status/latest",
      "https://twitter.com/_onmax/status/2116191062418997278/likes",
    ])
      expect(await issues(block(url)), url).toEqual([
        `\`::embed\` 1: can't read a post ID from ${url}. Use an x.com/<user>/status/<id> link.`,
      ]);
    expect(await render(block("https://x.com/_onmax"))).toContain('<a class="ce-card"');
    expect(
      await issues(
        `${block("https://youtu.be/dQw4w9WgXcQ")}\n\n${block("https://youtu.be/dQw4w9WgXcQ")}\n\n${block("https://example.com/a")}`,
      ),
    ).toEqual([
      "`::embed` 3: example.com has no player, so this renders as a link card. Add `title` so readers know what it links to.",
    ]);
    expect(await issues(block("https://youtu.be/dQw4w9WgXcQ", ' start="1:30"'))).toEqual([
      "`::embed` 1: `start` must be a whole number of seconds, such as `start=90`.",
    ]);
    expect(
      await issues(
        block("https://www.loom.com/share/e5b8c04bca094dd8a5507925ab887002", " start=5"),
      ),
    ).toEqual(["`::embed` 1: `start` only works for YouTube and Vimeo videos. Remove it."]);
    // An unclosed block takes in what follows it, which would vanish from the page.
    expect(await issues('::embed{url="https://youtu.be/dQw4w9WgXcQ"}\n\nNext paragraph')).toEqual([
      "`::embed` 1 drops the content inside it. Close the block with `::` on the line after it, and write text outside it.",
    ]);
  });
});
