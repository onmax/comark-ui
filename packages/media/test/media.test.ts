import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import chips from "../../chips/src/index.ts";
import zoom from "../../zoom/src/index.ts";
import media, { components } from "../src/html.ts";

// Sizes are read from remote files only in the tests that ask for them.
const render = createHtmlRenderer({ plugins: [media({ size: false })], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [media({ size: false })] })).meta.issues;
const attachment =
  "https://github.com/user-attachments/assets/2f3c0e3e-1c4b-4c3a-9a6b-0b1e2f3a4b5c";

describe("comark-media", () => {
  it("names each issue's rule in meta.issueRules", async () => {
    const { meta } = await parseMarkdown('![](demo.mp4)\n\n![Roof](roof.mp3){poster="roof.png"}', {
      plugins: [media()],
    });
    expect(Object.values(meta.issueRules)).toEqual([
      "comark/media/missing-label",
      "comark/media/poster-on-audio",
    ]);
  });

  it("plays a video with its alt as the label, and inlines the styles once", async () => {
    const html = await render(
      "![Signing in with a passkey](./login.mp4)\n\n![Checkout](https://cdn.test/a.webm?v=2)",
    );
    expect(html).toContain(
      '<span class="cm cm-video" role="group" aria-label="Signing in with a passkey"><video src="./login.mp4" controls playsinline preload="metadata" aria-label="Signing in with a passkey"><a href="./login.mp4">Signing in with a passkey</a></video><span class="cm-bar">',
    );
    expect(html).toContain('src="https://cdn.test/a.webm?v=2"');
    expect(html.match(/<style data-comark-media>/g)).toHaveLength(1);
  });

  it("reads .mp4, .webm, .mov, and .m4v as video, .mp3, .wav, .ogg, and .m4a as audio, and leaves images", async () => {
    for (const file of ["a.mp4", "a.webm", "a.MOV", "a.m4v"])
      expect(await render(`![Clip](${file})`), file).toContain(
        `<span class="cm cm-video" role="group" aria-label="Clip"><video src="${file}"`,
      );
    for (const file of ["a.mp3", "a.wav", "a.ogg", "a.m4a"])
      expect(await render(`![Clip](${file})`), file).toContain(
        `<span class="cm cm-audio" role="group" aria-label="Clip"><audio src="${file}" controls preload="metadata" aria-label="Clip">`,
      );
    expect(await render("![Diagram](a.png)")).toContain('<img src="a.png" alt="Diagram"');
  });

  it("gives videos and audio controls that keep the browser's as a fallback, with the script once per document", async () => {
    const html = await render("![Alert](alert.mp3)\n\n![Chime](chime.ogg)\n\n![Clip](clip.mp4)");
    expect(html).toContain(
      '<audio src="alert.mp3" controls preload="metadata" aria-label="Alert"><a href="alert.mp3">Alert</a></audio><span class="cm-bar"><button type="button" class="cm-play" aria-label="Play">',
    );
    expect(html).toContain(
      '<input type="range" class="cm-seek" min="0" max="0" step="any" value="0" aria-label="Seek">',
    );
    expect(html.match(/<span class="cm-bar">/g)).toHaveLength(3);
    expect(
      html.match(
        /<input type="range" class="cm-volume" min="0" max="1" step="0.05" value="1" aria-label="Volume">/g,
      ),
    ).toHaveLength(3);
    expect(html.match(/class="cm-full"/g)).toHaveLength(1);
    expect(
      html.match(/class="cm-settings" aria-label="Settings" aria-expanded="false"/g),
    ).toHaveLength(3);
    expect(html).toContain(
      '<span class="cm-choices" role="radiogroup" aria-label="Speed"><label><input type="radio" data-option="speed" value="0.5">0.5&#215;</label>',
    );
    expect(html).toContain(
      '<span class="cm-choices" role="radiogroup" aria-label="Loop"><label><input type="radio" data-option="loop" value="off">Off</label><label><input type="radio" data-option="loop" value="on">On</label></span>',
    );
    expect(html.match(/<script>/g)).toHaveLength(1);
  });

  it('keeps the browser\'s controls with `controls: "native"`, and no script', async () => {
    const native = createHtmlRenderer({ plugins: [media({ controls: "native" })], components });
    const html = await native("![Alert](alert.mp3){loop}\n\n![Clip](clip.mp4)");
    expect(html).toContain(
      '<audio class="cm" src="alert.mp3" controls preload="metadata" loop aria-label="Alert"><a href="alert.mp3">Alert</a></audio>',
    );
    expect(html).toContain(
      '<video class="cm" src="clip.mp4" controls playsinline preload="metadata" aria-label="Clip"><a href="clip.mp4">Clip</a></video>',
    );
    expect(html).not.toContain('class="cm-bar"');
    expect(html).not.toContain("<script>");
    expect(await issues("![Alert](alert.mp3){native}")).toEqual([
      "`![Alert](alert.mp3)`: `native` isn't an audio option, so it was dropped. Use autoplay, loop, or muted.",
    ]);
  });

  it("passes autoplay, loop, muted, and poster through", async () => {
    const html = await render('![Spinner](spin.mp4){autoplay loop muted poster="spin.png"}');
    expect(html).toContain(
      '<video src="spin.mp4" controls playsinline preload="metadata" poster="spin.png" autoplay loop muted aria-label="Spinner">',
    );
    expect(await render("![Spinner](spin.mp4){loop=false}")).not.toMatch(/<video[^>]* loop/);
  });

  it("plays a GitHub attachment link alone in a paragraph, and only that", async () => {
    expect(await render(attachment)).toContain(
      `<span class="cm cm-video"><video src="${attachment}" controls playsinline preload="metadata"><a href="${attachment}">${attachment}</a></video>`,
    );
    expect(await render(`See ${attachment}`)).not.toContain("<video");
    expect(await render(`[the recording](${attachment})`)).not.toContain("<video");
    for (const suffix of ["?download=1", "#fragment"]) {
      const url = `${attachment}${suffix}`;
      expect(await render(url)).toContain(`<video src="${url}"`);
      expect(await render(`See ${url}`)).not.toContain("<video");
      expect(await render(`[the recording](${url})`)).not.toContain("<video");
    }
  });

  it("runs before comark-chips and comark-zoom in any order", async () => {
    const markdown = `![Flow](flow.mp4)\n\n${attachment}`;
    const value = await parseMarkdown(markdown, {
      plugins: [chips({ download: false }), zoom({ size: false }), media({ size: false })],
    });
    expect(value.nodes).toEqual([
      ["p", {}, ["media", { kind: "video", src: "flow.mp4", label: "Flow" }]],
      ["p", {}, ["media", { kind: "video", src: attachment }]],
    ]);
    expect(value.meta.issues).toEqual([]);
  });

  it("reports a missing label, autoplay without muted, a poster on audio, and unknown attributes", async () => {
    expect(await issues("![](demo.mp4)")).toEqual([
      "`![](demo.mp4)` has no label. Describe the video in the brackets, like `![Signing in with a passkey](demo.mp4)`.",
    ]);
    expect(await issues("![Demo](demo.mp4){autoplay}")).toEqual([
      "`![Demo](demo.mp4)`: browsers only start a video by itself when it's muted. Add `muted`, or remove `autoplay`.",
    ]);
    expect(await issues('![Song](a.mp3){poster="a.png"}')).toEqual([
      "`![Song](a.mp3)`: audio has no picture, so `poster` was dropped. Remove it.",
    ]);
    expect(await issues("![Demo](demo.mp4){chapters=1 .wide}")).toEqual([
      "`![Demo](demo.mp4)`: `chapters`, `class` aren't video options, so they were dropped. Use autoplay, loop, muted, poster, width, or height.",
    ]);
    expect(await issues("![Song](a.mp3){width=600}")).toEqual([
      "`![Song](a.mp3)`: `width` isn't an audio option, so it was dropped. Use autoplay, loop, or muted.",
    ]);
    expect(await issues("![Demo](demo.mp4){width=600}")).toEqual([
      "`![Demo](demo.mp4)`: `width` and `height` are the video's size in pixels and go together, like `{width=1280 height=720}`, so it was dropped. Supply both sides.",
    ]);
  });

  describe("sizes", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });
    // The first bytes of an MP4: its type, then an index with one 1280 by 720 track.
    const be = (value: number) => [
      value >>> 24,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
    const box = (type: string, payload: number[]) => [
      ...be(payload.length + 8),
      ...new TextEncoder().encode(type),
      ...payload,
    ];
    const identity = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].flatMap(be);
    const tkhd = box("tkhd", [
      ...Array(40).fill(0),
      ...identity,
      ...be(1280 << 16),
      ...be(720 << 16),
    ]);
    const mp4 = new Uint8Array([
      ...box("ftyp", [105, 115, 111, 109, 0, 0, 0, 0]),
      ...box("moov", box("trak", tkhd)),
    ]);

    it("gives a video the width and height it was written with, so the page keeps its room", async () => {
      const html = await render("![Demo](demo.mp4){width=1280 height=720}");
      expect(html).toContain(
        '<video src="demo.mp4" controls playsinline preload="metadata" width="1280" height="720"',
      );
    });

    it("reads a remote video's size from its first bytes, and leaves audio and local files alone", async () => {
      const fetch = vi.fn(async () => new Response(mp4, { status: 206 }));
      vi.stubGlobal("fetch", fetch);
      const render = createHtmlRenderer({ plugins: [media({ size: true })], components });
      expect(await render("![Demo](https://cdn.test/sized.mp4)")).toContain(
        'preload="metadata" width="1280" height="720"',
      );
      expect(
        await render("![Demo](./local.mp4)\n\n![Song](https://cdn.test/song.mp3)"),
      ).not.toMatch(/<(video|audio)[^>]* width=/);
      expect(fetch).toHaveBeenCalledTimes(1);
      const off = createHtmlRenderer({ plugins: [media({ size: false })], components });
      expect(await off("![Demo](https://cdn.test/off.mp4)")).not.toMatch(/<video[^>]* width=/);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("does not request remote videos by default, even with an authored size flag", async () => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const render = createHtmlRenderer({ plugins: [media()], components });
      expect(await render("![Internal](http://127.0.0.1/private.mp4){size=true}")).not.toMatch(
        /<video[^>]* width=/,
      );
      expect(
        await render("![Internal](http://127.0.0.1/private.mp4){width=1280 height=720}"),
      ).toMatch(/<video[^>]* width="1280" height="720"/);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it("escapes what it writes", async () => {
    const html = await render('![A "quoted" <b>](a.mp4)');
    expect(html).toContain('aria-label="A &quot;quoted&quot; &lt;b&gt;"');
  });
});
