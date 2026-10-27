// The playground: renders the editor's Markdown in the browser with every plugin that runs there, but not Shiki,
// which would triple the bundle.
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { defaultConfig, readConfig } from "./config.ts";
import { defaultTheme, readTheme, themeCss, themePresets, type Theme } from "./play-theme.ts";
import { browserPlugins, components } from "./plugins.ts";
import { previewDocument } from "./preview.ts";

function find<T extends Element>(selector: string, type: new () => T) {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`The playground needs ${selector}.`);
  return element;
}
const editor = find('.play-code[data-pane="markdown"] textarea', HTMLTextAreaElement);
const configEditor = find('.play-code[data-pane="config"] textarea', HTMLTextAreaElement);
const panes = find(".play-panes", HTMLDivElement);
const preview = find(".play-preview", HTMLIFrameElement);
const issues = find(".play-issues", HTMLUListElement);
const share = find(".play-share", HTMLButtonElement);
const copy = find(".play-copy", HTMLButtonElement);
const tools = find(".play-tools", HTMLDivElement);
const themePane = find(".play-theme", HTMLDivElement);
const schemes = find(".play-scheme", HTMLDivElement);
const themeButtons = find(".play-theme-presets", HTMLDivElement);
const themeReset = find(".play-theme-reset", HTMLButtonElement);
const themeCopy = find(".play-theme-copy", HTMLButtonElement);
const extraCss = find("#play-theme-css", HTMLTextAreaElement);
const reset = find(".play-reset", HTMLButtonElement);
const confirmReset = find(".play-confirm", HTMLDialogElement);
const npmx = find(".top a.npmx", HTMLAnchorElement);
const npmxName = find(".top a.npmx span", HTMLSpanElement);
const presets: { id: string; source: string; npm: string }[] = JSON.parse(
  find("#presets", HTMLScriptElement).text,
);

// A shared link carries its Markdown in the hash, deflated, so nothing is stored anywhere. A changed config rides
// along the same way.
const sharingUnsupported = "Sharing is unavailable in this browser (raw deflate is not supported).";
function compressionStream(kind: "compress" | "decompress") {
  const Stream = kind === "compress" ? CompressionStream : DecompressionStream;
  if (typeof Stream !== "function") throw new Error(sharingUnsupported);
  try {
    return new Stream("deflate-raw");
  } catch {
    throw new Error(sharingUnsupported);
  }
}
async function pack(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(compressionStream("compress"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
async function unpack(code: string) {
  const binary = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(compressionStream("decompress"));
  return new Response(stream).text();
}

// The editor is a transparent textarea over its own text, colored. Until the grammar loads, the text under it is
// plain. The extra line keeps a trailing newline as tall as the textarea's.
let highlight: ((code: string, lang: "mdc" | "json") => string) | undefined;
function repaint(textarea = editor) {
  const paint = textarea.previousElementSibling;
  if (!paint) return;
  const text = `${textarea.value}\n `;
  if (highlight) paint.innerHTML = highlight(text, textarea === editor ? "mdc" : "json");
  else paint.replaceChildren(Object.assign(document.createElement("pre"), { textContent: text }));
}
void import("./highlight.ts").then((module) => {
  highlight = module.highlight;
  repaint(editor);
  repaint(configEditor);
});

// The Markdown, the config, and the theme share the editor's column; the bar's switch shows one of them. The theme
// has its own Reset and Copy, so the corner's are for the code panes.
panes.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!button?.dataset.pane) return;
  for (const other of panes.querySelectorAll("button"))
    other.setAttribute("aria-pressed", String(other === button));
  for (const pane of document.querySelectorAll<HTMLElement>(".play-code, .play-theme"))
    pane.hidden = pane.dataset.pane !== button.dataset.pane;
  tools.hidden = button.dataset.pane === "theme";
  copy.setAttribute(
    "aria-label",
    button.dataset.pane === "config" ? "Copy the config" : "Copy the Markdown",
  );
});

// Each still in the presets' column is a page scaled to show all of itself, unless that would fill less than most of
// its card's width; then it fills that much and shows its top. A page that fits whole lays out at whichever width
// shows it largest, so a sentence wraps narrow and stays legible. A chart or a screenshot, whose height follows its
// width, gains nothing narrower and keeps the page's width.
const NARROWER = [448, 320, 224];
// Reading a page's height lays out the whole playground, a few hundred stills, so every still takes a width before any
// is read: one layout per width, not one per width per still, which took seconds.
function fit(thumbs: Set<HTMLElement>) {
  const stills = [...thumbs].flatMap((thumb) => {
    const page = thumb.firstElementChild;
    return page instanceof HTMLElement && thumb.clientWidth && page.offsetWidth
      ? [{ page, width: thumb.clientWidth, height: thumb.clientHeight, best: 640, largest: 0 }]
      : [];
  });
  const whole = (pageWidth: (still: (typeof stills)[number]) => number) => {
    for (const still of stills) still.page.style.width = `${pageWidth(still)}px`;
    return stills.map((still) =>
      Math.min(still.width / pageWidth(still), still.height / still.page.offsetHeight),
    );
  };
  for (const [index, scale] of whole(({ best }) => best).entries()) stills[index]!.largest = scale;
  // Only a clearly larger still is worth a narrower layout.
  for (const pageWidth of NARROWER)
    for (const [index, scale] of whole(() => pageWidth).entries()) {
      const still = stills[index]!;
      if (scale > still.largest * 1.15) [still.best, still.largest] = [pageWidth, scale];
    }
  for (const still of stills) still.page.style.width = `${still.best}px`;
  const sizes = stills.map(({ page }) => ({
    pageWidth: page.offsetWidth,
    pageHeight: page.offsetHeight,
  }));
  for (const [index, { page, width, height }] of stills.entries()) {
    const { pageWidth, pageHeight } = sizes[index]!;
    const scale = Math.min(
      width / pageWidth,
      Math.max(height / pageHeight, (width * 0.7) / pageWidth),
    );
    const x = (width - pageWidth * scale) / 2;
    const y = Math.max(0, (height - pageHeight * scale) / 2);
    page.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
}
const fitting = new ResizeObserver((entries) =>
  fit(
    new Set(
      entries.flatMap(({ target }) =>
        target instanceof HTMLElement
          ? [target.classList.contains("preset-thumb") ? target : (target.parentElement ?? target)]
          : [],
      ),
    ),
  ),
);
for (const thumb of document.querySelectorAll(".preset-thumb")) {
  fitting.observe(thumb);
  if (thumb.firstElementChild) fitting.observe(thumb.firstElementChild);
}

function showIssues(list: string[]) {
  issues.replaceChildren(
    ...list.map((issue) => Object.assign(document.createElement("li"), { textContent: issue })),
  );
  issues.hidden = !list.length;
}

function markPreset(id?: string) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".pages a[data-preset]"))
    link.toggleAttribute("aria-current", link.dataset.preset === id);
}

// A package's "Open in playground" lands on its example, which can sit far down the presets' column, so the column
// scrolls to center it. One already in view stays put, so a click in the column doesn't move it.
function revealPreset(id?: string) {
  const card = document.querySelector(`.sidebar .pages a[data-preset="${id}"]`)?.closest(".preset");
  const column = card?.closest(".pages");
  if (!(card instanceof HTMLElement) || !(column instanceof HTMLElement) || !column.clientHeight)
    return;
  const top = card.getBoundingClientRect().top - column.getBoundingClientRect().top;
  if (top >= 0 && top + card.offsetHeight <= column.clientHeight) return;
  column.scrollTop += top - (column.clientHeight - card.offsetHeight) / 2;
}

// The example the Markdown started from. Once the Markdown differs from it, Reset appears and brings it back.
let base: (typeof presets)[number] | undefined;
function markEdited() {
  reset.hidden = !base || editor.value === base.source;
  if (base) markPreset(reset.hidden ? base.id : undefined);
}

// The header's npmx link follows the preset, and stays on its package while you edit it. A shared link's Markdown
// could use any of them, so it gets comark-ui, which installs all of them.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function pointNpmx(npm?: string) {
  const name = npm || "comark-ui";
  npmx.href = `https://npmx.dev/package/${name}`;
  npmx.title = `${name} on npmx`;
  if (npmxName.textContent === name) return;
  const from = npmx.offsetWidth;
  npmxName.textContent = name;
  const to = npmx.offsetWidth;
  // The pill resizes to the new name as the name rises into it, so the swap reads as one change of package.
  const ease = "cubic-bezier(0.23, 1, 0.32, 1)";
  if (reducedMotion.matches) {
    npmxName.animate({ opacity: [0, 1] }, { duration: 150, easing: "ease-out" });
    return;
  }
  if (from !== to)
    npmx.animate({ width: [`${from}px`, `${to}px`] }, { duration: 250, easing: ease });
  npmxName.animate(
    { opacity: [0, 1], filter: ["blur(2px)", "blur(0)"], transform: ["translateY(6px)", "none"] },
    { duration: 200, easing: ease },
  );
}

// The Theme pane. Its tokens and CSS go in the preview's #play-theme and its scheme on the preview's root, so a change
// shows without rendering the Markdown again.
let theme = defaultTheme();
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const scheme = () => theme.scheme ?? (systemDark.matches ? "dark" : "light");
const tokenFields = [...themePane.querySelectorAll<HTMLInputElement>("input[data-token]")];
const field = (token: string) => tokenFields.find((input) => input.dataset.token === token);
const swatches = [...themePane.querySelectorAll<HTMLInputElement>("input[data-swatch]")];
const radius = find('.play-theme input[data-slider="radius"]', HTMLInputElement);
const shadcnNames: Record<string, string> = { muted: "muted-foreground" };

// Each swatch shows the color the preview draws now, flattened onto its background: a canvas pixel turns any CSS
// color, oklch or translucent, into the hex a color input takes.
const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
function hex(...layers: string[]) {
  if (!pixel) return "#000000";
  pixel.clearRect(0, 0, 1, 1);
  for (const layer of layers) {
    pixel.fillStyle = layer;
    pixel.fillRect(0, 0, 1, 1);
  }
  const [red = 0, green = 0, blue = 0] = pixel.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function showTheme() {
  const doc = preview.contentDocument;
  const view = doc?.defaultView;
  if (!doc?.body || !view) return;
  const currentScheme = scheme();
  doc.documentElement.className = currentScheme;
  doc.documentElement.style.colorScheme = currentScheme;
  const fallback =
    currentScheme === "dark"
      ? {
          background: "#0a0a0a",
          foreground: "#fafafa",
          "muted-foreground": "#a1a1a1",
          border: "rgb(255 255 255 / 0.1)",
          accent: "#262626",
          ring: "#737373",
        }
      : {
          background: "#fff",
          foreground: "#0a0a0a",
          "muted-foreground": "#737373",
          border: "#e5e5e5",
          accent: "#f5f5f5",
          ring: "#a1a1a1",
        };
  const style =
    doc.getElementById("play-theme") ??
    doc.head.appendChild(Object.assign(doc.createElement("style"), { id: "play-theme" }));
  const fallbackCss = `:root {\n${Object.entries(fallback)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n")}\n}`;
  style.textContent = [fallbackCss, themeCss(theme)].filter(Boolean).join("\n\n");
  const probe = doc.body.appendChild(doc.createElement("i"));
  probe.hidden = true;
  const color = (value: string) => {
    probe.style.color = value;
    return view.getComputedStyle(probe).color;
  };
  const background = color("var(--comark-background, var(--background))");
  for (const swatch of swatches) {
    const token = swatch.dataset.swatch ?? "";
    const fallback = `var(--${shadcnNames[token] ?? token})`;
    swatch.value = hex(background, color(`var(--comark-${token}, ${fallback})`));
    const input = field(token);
    if (input) input.placeholder = hex(background, color(fallback));
  }
  probe.style.borderRadius = "var(--comark-radius, var(--radius, 0.625rem))";
  radius.value = String(parseFloat(view.getComputedStyle(probe).borderTopLeftRadius) / 16);
  probe.style.fontFamily =
    "var(--comark-font, var(--font-sans, ui-sans-serif, system-ui, sans-serif))";
  const font = field("font");
  if (font && !theme.tokens.font) font.placeholder = view.getComputedStyle(probe).fontFamily;
  const radiusField = field("radius");
  if (radiusField) radiusField.placeholder = "0.625rem";
  probe.remove();
}

// The switches show the theme's preset and scheme, and Reset appears once the theme differs from its preset. A click
// on a switch moves its sliding indicator, so one is sent when the script changes it.
function markTheme() {
  for (const [group, pressed] of [
    [themeButtons, theme.preset],
    [schemes, scheme()],
  ] as const) {
    for (const button of group.querySelectorAll<HTMLButtonElement>("button"))
      button.setAttribute(
        "aria-pressed",
        String((button.dataset.theme ?? button.dataset.scheme) === pressed),
      );
    group.dispatchEvent(new Event("click"));
  }
  const preset = themePresets.find((preset) => preset.id === theme.preset);
  themeReset.hidden =
    !preset ||
    (preset.css === theme.css &&
      tokenFields.every(({ dataset: { token = "" } }) => {
        const key = token as keyof Theme["tokens"];
        return (preset.tokens[key] ?? "") === (theme.tokens[key] ?? "");
      }));
}

function setTheme(next: Theme) {
  theme = next;
  for (const input of tokenFields)
    input.value = theme.tokens[(input.dataset.token ?? "") as keyof Theme["tokens"]] ?? "";
  extraCss.value = theme.css;
  // Extra CSS stays folded until there is some to show.
  extraCss.closest("details")?.toggleAttribute("open", Boolean(theme.css));
  showTheme();
  markTheme();
}

let themeTimer: ReturnType<typeof setTimeout> | undefined;
function themeChanged() {
  showTheme();
  markTheme();
  clearTimeout(themeTimer);
  themeTimer = setTimeout(async () => {
    try {
      history.replaceState(null, "", await link());
    } catch (error) {
      showIssues([error instanceof Error ? error.message : String(error)]);
    }
  }, 200);
}

function setToken(token: string, value: string) {
  const key = token as keyof Theme["tokens"];
  if (value.trim()) theme.tokens[key] = value.trim();
  else delete theme.tokens[key];
  themeChanged();
}

function pickPreset(id: string) {
  const preset = themePresets.find((preset) => preset.id === id);
  if (!preset) return;
  setTheme({ preset: id, tokens: { ...preset.tokens }, css: preset.css, scheme: theme.scheme });
  themeChanged();
}

themePane.addEventListener("input", (event) => {
  const input = event.target;
  if (input === extraCss) {
    theme.css = extraCss.value;
    themeChanged();
  }
  if (!(input instanceof HTMLInputElement)) return;
  const { token, swatch, slider } = input.dataset;
  const target = field(swatch ?? slider ?? "");
  if (target) target.value = slider ? `${input.value}rem` : input.value;
  if (token ?? target?.dataset.token)
    setToken(token ?? target?.dataset.token ?? "", target?.value ?? input.value);
});
themeButtons.addEventListener("click", (event) => {
  const id = event.target instanceof Element && event.target.closest("button")?.dataset.theme;
  if (id) pickPreset(id);
});
schemes.addEventListener("click", (event) => {
  const value = event.target instanceof Element && event.target.closest("button")?.dataset.scheme;
  if (value !== "light" && value !== "dark") return;
  theme.scheme = value;
  themeChanged();
});
themeReset.addEventListener("click", () => pickPreset(theme.preset));
themeCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      themeCss(theme) || "/* The default theme: nothing to set. */",
    );
    themeCopy.textContent = "Copied";
    setTimeout(() => (themeCopy.textContent = "Copy CSS"), 1500);
  } catch (error) {
    showIssues([error instanceof Error ? error.message : String(error)]);
  }
});
systemDark.addEventListener("change", () => {
  if (theme.scheme) return;
  showTheme();
  markTheme();
});
preview.addEventListener("load", showTheme);
showTheme();
markTheme();

let run = 0;
let loadIssues: string[] = [];
async function render() {
  const current = ++run;
  let html = "";
  const { config, issues: configIssues } = readConfig(configEditor.value);
  let problems: string[] = [];
  try {
    const parsed = await parseMarkdown(editor.value, {
      plugins: browserPlugins(config, { download: false }),
    });
    html = await renderHtmlFromDocument(parsed, { components });
    problems = [...loadIssues, ...configIssues, ...parsed.meta.issues];
  } catch (error) {
    problems = [
      ...loadIssues,
      ...configIssues,
      error instanceof Error ? error.message : String(error),
    ];
  }
  // A slower render of older text must not replace a newer one.
  if (current !== run) return;
  const top = preview.contentWindow?.scrollY ?? 0;
  preview.addEventListener("load", () => preview.contentWindow?.scrollTo(0, top), { once: true });
  preview.srcdoc = previewDocument(html, { scheme: scheme(), css: themeCss(theme) });
  showIssues(problems);
}

async function link() {
  const config =
    configEditor.value === defaultConfig ? "" : `&config=${await pack(configEditor.value)}`;
  const themed =
    themeCss(theme) || theme.preset !== "shadcn" || theme.scheme
      ? `&theme=${await pack(JSON.stringify(theme))}`
      : "";
  return `#md=${await pack(editor.value)}${config}${themed}`;
}

let loadRun = 0;
async function load() {
  const run = ++loadRun;
  const navigationIssues: string[] = [];
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = hash.get("md");
  const config = hash.get("config");
  const sharedTheme = hash.get("theme");
  // A preset keeps whatever config is in the tab, so one config can be tried across them.
  if (config !== null) {
    const decodedConfig = await unpack(config).catch(() => {
      navigationIssues.push("The link's config is cut off or changed; using the default config.");
      return defaultConfig;
    });
    if (run !== loadRun) return;
    configEditor.value = decodedConfig;
    repaint(configEditor);
  } else if (code !== null) configEditor.value = defaultConfig;
  // The theme rides along like the config.
  let nextTheme: Theme | undefined;
  if (sharedTheme !== null)
    nextTheme = await unpack(sharedTheme)
      .then((text) => readTheme(JSON.parse(text)))
      .catch(() => {
        navigationIssues.push("The link's theme is cut off or changed; using the default theme.");
        return defaultTheme();
      });
  else if (code !== null) nextTheme = defaultTheme();
  if (run !== loadRun) return;
  if (nextTheme) setTheme(nextTheme);
  const preset =
    presets.find((preset) => preset.id === hash.get("preset")) ??
    (code === null ? presets[0] : undefined);
  let markdown = preset?.source;
  if (!preset && code !== null)
    markdown = await unpack(code).catch((error) =>
      error instanceof Error && error.message === sharingUnsupported
        ? sharingUnsupported
        : "The link's Markdown is cut off or changed.",
    );
  if (run !== loadRun) return;
  loadIssues = navigationIssues;
  if (markdown !== undefined) editor.value = markdown;
  base = preset;
  markPreset(preset?.id);
  revealPreset(preset?.id);
  reset.hidden = true;
  pointNpmx(preset?.npm);
  repaint(editor);
  repaint(configEditor);
  if (run === loadRun) await render();
}

let timer: ReturnType<typeof setTimeout> | undefined;
for (const textarea of [editor, configEditor])
  textarea.addEventListener("input", () => {
    if (textarea === configEditor) {
      loadIssues = [];
    }
    repaint(textarea);
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (textarea === editor) markEdited();
      // Replaced, not pushed: Back leaves the playground instead of stepping through keystrokes.
      try {
        history.replaceState(null, "", await link());
      } catch (error) {
        showIssues([error instanceof Error ? error.message : String(error)]);
      }
      await render();
    }, 200);
  });
share.addEventListener("click", async () => {
  try {
    history.replaceState(null, "", await link());
    await navigator.clipboard.writeText(location.href);
    share.textContent = "Copied";
    setTimeout(() => (share.textContent = "Copy link"), 1500);
  } catch (error) {
    showIssues([error instanceof Error ? error.message : String(error)]);
  }
});
// Resetting drops edits that live nowhere else, so it asks first.
reset.addEventListener("click", () => {
  confirmReset.returnValue = "";
  confirmReset.showModal();
});
confirmReset.addEventListener("close", () => {
  if (confirmReset.returnValue === "reset" && base) location.hash = `preset=${base.id}`;
});
copy.addEventListener("click", async () => {
  const shown = configEditor.closest<HTMLElement>(".play-code")?.hidden ? editor : configEditor;
  try {
    await navigator.clipboard.writeText(shown.value);
    copy.classList.add("copied");
    setTimeout(() => copy.classList.remove("copied"), 1200);
  } catch (error) {
    showIssues([error instanceof Error ? error.message : String(error)]);
  }
});
addEventListener("hashchange", load);
// The build already rendered the first preset, so only a link to something else needs a render now.
if (location.hash) await load();
else {
  base = presets[0];
  markPreset(base?.id);
}
