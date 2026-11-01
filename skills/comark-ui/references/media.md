# Videos and audio

comark-media plays an image that points at a video or a sound file, and a GitHub attachment link alone on its line, with the alt text as the player's label. Use it for a screen recording in PR evidence: a transition, a loading state, or a sound, which a screenshot can't show.

## Syntax

```md
The spinner now stops once the build finishes:

![The build spinner stops and the Deploy button turns green](./recordings/build.mp4){loop muted width=1280 height=720}
```

- A `src` that ends in `.mp4`, `.webm`, `.mov`, or `.m4v`, before any `?` or `#`, plays as a video, and one in `.mp3`, `.wav`, `.ogg`, or `.m4a` as audio. Every other image stays an image.
- The alt text is required. It names the player for screen readers, and it's the text of a link to the file where the browser can't play it.
- `autoplay`, `loop`, and `muted` are off by default. Browsers start a file by itself only when it's muted, so `autoplay` needs `muted`. `poster="frame.png"` shows an image before a video plays; audio takes none. `{loop=false}` turns a prop off. Give every video its `width` and `height`, paired whole pixel dimensions like `{width=1280 height=720}`, so the page keeps its room before the file loads; read them with `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 clip.mp4`. Audio takes neither. Other props, such as a class, are dropped and reported.
- A GitHub attachment link, `https://github.com/user-attachments/assets/<id>`, plays as a video when the bare URL sits alone in its paragraph, as on GitHub. With text of its own, or inside a sentence, it stays a link.

## Record the evidence

- Record only the part of the screen that changes, for a few seconds.
- Encode it as H.264 `.mp4` for every browser, or `.webm` for a smaller file. A `.mov` from macOS doesn't always play in Firefox.
- Say what happens in the alt text, so a reader who can't play the file still learns what it shows.
- Add `loop muted` to a clip of one motion, so it reads like an animated screenshot once played.
- A GitHub attachment from a private repository plays only for readers signed in with access to it. For a page that others read, download the file and serve it with the page.

## Register

- In `comark-ui`: on. `media: { controls: "native" }` keeps the browser's own controls and leaves the script out. Measurement reads only data URIs by default. `media: { size: true }` also measures remote videos while parsing; use it only for trusted documents, since requests follow redirects and can reach private networks. `media: { size: false }` disables measurement. Authored dimensions work with any setting. Alone, pass the same options to `media()`.
- Alone: `pnpm add comark @comark/html comark-media`, then `createHtmlRenderer({ plugins: [media()], components })` with both from `comark-media/html`. `comark-media/vue`, `/react`, and `/svelte` render it too. Its place in `plugins` doesn't matter. It reads the tokens before any plugin sees the tree, so comark-zoom never zooms a video and comark-chips never turns an attachment link into a chip. The HTML renderer inlines the players' script once per document, and the browser's own controls show until it runs and whenever a file can't play.
