import { createHtmlRenderer } from "@comark/html";
import { parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import chips from "../../chips/src/index.ts";
import zoom from "../../zoom/src/index.ts";
import media, { components } from "../src/html.ts";

const render = createHtmlRenderer({ plugins: [media()], components });
const issues = async (markdown: string) =>
  (await parseMarkdown(markdown, { plugins: [media()] })).meta.issues;
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
      plugins: [chips({ download: false }), zoom(), media()],
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
    expect(await issues("![Demo](demo.mp4){width=600 .wide}")).toEqual([
      "`![Demo](demo.mp4)`: `width`, `class` aren't video options, so they were dropped. Use autoplay, loop, muted, or poster.",
    ]);
  });

  it("escapes what it writes", async () => {
    const html = await render('![A "quoted" <b>](a.mp4)');
    expect(html).toContain('aria-label="A &quot;quoted&quot; &lt;b&gt;"');
  });
});
