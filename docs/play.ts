// The playground: renders the editor's Markdown in the browser with every plugin that runs there, but not Shiki,
// which would triple the bundle. docs/app/pages/play/index.vue starts it on mount and stops it on unmount, since the
// docs app navigates without loading pages.
import { renderHtmlFromDocument } from "@comark/html";
import { parseMarkdown } from "comark";
import { defaultConfig, readConfig } from "./config.ts";
import { defaultTheme, readTheme, themeCss, themePresets, type Theme } from "./play-theme.ts";
import { browserPlugins, components } from "./plugins.ts";
import { previewDocument } from "./preview.ts";
import {
  decodePlaygroundLink,
  encodePlaygroundLink,
  playgroundUrl,
  readPlaygroundHash,
  type PlaygroundFiles,
} from "@vite-hub/ui-playground/playground";
import { configFile, contentFile, presetCode, templateOf, themeFile } from "./play-link.ts";
import { errorText } from "../shared/text.ts";

export interface Preset {
  id: string;
  source: string;
  npm: string;
}

/** Starts the playground in `root`, which holds the page's markup, and returns what stops it. */
export async function startPlayground(
  root: HTMLElement,
  presets: Preset[],
  onPackage: (npm: string) => void,
): Promise<() => void> {
  const stopped = new AbortController();
  const { signal } = stopped;
  const pending = new Set<ReturnType<typeof setTimeout>>();
  // Vue Router keeps its own state in history.state, so a replace keeps it, and none lands after the page has gone.
  const replace = (url: string) => {
    if (!signal.aborted) history.replaceState(history.state, "", url);
  };
  const later = (run: () => void, ms: number) => {
    const id = setTimeout(() => {
      pending.delete(id);
      run();
    }, ms);
    pending.add(id);
  };

  function find<T extends Element>(selector: string, type: new () => T) {
    const element = root.querySelector(selector);
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

  // A shared link carries its Markdown in the hash, deflated, so nothing is stored anywhere. A changed config rides
  // along the same way.

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
  // The grammar is as big as the rest of the playground, so it loads after the first render instead of delaying it.
  const loadHighlight = () =>
    import("./highlight.ts").then((module) => {
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
    for (const pane of root.querySelectorAll<HTMLElement>(".play-code, .play-theme"))
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
    for (const [index, scale] of whole(({ best }) => best).entries())
      stills[index]!.largest = scale;
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
            ? [
                target.classList.contains("preset-thumb")
                  ? target
                  : (target.parentElement ?? target),
              ]
            : [],
        ),
      ),
    ),
  );
  // A still is fitted once it nears the screen, so opening the playground lays out a screenful of stills, not all of
  // them.
  const nearing = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        nearing.unobserve(target);
        fitting.observe(target);
        if (target.firstElementChild) fitting.observe(target.firstElementChild);
      }
    },
    { rootMargin: "50% 0px" },
  );
  for (const thumb of root.querySelectorAll(".preset-thumb")) nearing.observe(thumb);
  function showIssues(list: string[]) {
    issues.replaceChildren(
      ...list.map((issue) => Object.assign(document.createElement("li"), { textContent: issue })),
    );
    issues.hidden = !list.length;
  }

  function markPreset(id?: string) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>(".play-presets a[data-preset]"))
      link.toggleAttribute("aria-current", link.dataset.preset === id);
  }

  // A package's "Open in playground" lands on its example, which can sit far down the presets' column, so the column
  // scrolls to center it. One already in view stays put, so a click in the column doesn't move it.
  function revealPreset(id?: string) {
    const card = root.querySelector(`.play-presets a[data-preset="${id}"]`)?.closest(".preset");
    const column = card?.closest(".play-presets");
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

  // The package the preset documents. A shared link's Markdown could use any of them, so it gets comark-ui, which
  // installs all of them. The page shows it beside the editor.
  function pointNpmx(npm?: string) {
    onPackage(npm || "comark-ui");
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
        replace(await link());
      } catch (error) {
        showIssues([errorText(error)]);
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
      later(() => (themeCopy.textContent = "Copy CSS"), 1500);
    } catch (error) {
      showIssues([errorText(error)]);
    }
  });
  systemDark.addEventListener(
    "change",
    () => {
      if (theme.scheme) return;
      showTheme();
      markTheme();
    },
    { signal },
  );
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
      problems = [...loadIssues, ...configIssues, errorText(error)];
    }
    // A slower render of older text must not replace a newer one.
    if (current !== run) return;
    const top = preview.contentWindow?.scrollY ?? 0;
    preview.addEventListener("load", () => preview.contentWindow?.scrollTo(0, top), { once: true });
    preview.srcdoc = previewDocument(html, { scheme: scheme(), css: themeCss(theme) });
    showIssues(problems);
  }

  const templates = presets.map(templateOf);
  async function link() {
    const files: PlaygroundFiles = { [contentFile]: editor.value };
    if (configEditor.value !== defaultConfig) files[configFile] = configEditor.value;
    if (themeCss(theme) || theme.preset !== "shadcn" || theme.scheme)
      files[themeFile] = JSON.stringify(theme);
    const template = base && templateOf(base);
    const code = await encodePlaygroundLink({ template: template?.id, files }, template?.files);
    return playgroundUrl("", code);
  }

  let loadRun = 0;
  async function load() {
    if (signal.aborted) return;
    const run = ++loadRun;
    const navigationIssues: string[] = [];
    const code = readPlaygroundHash(location.hash);
    const state = code === undefined ? undefined : await decodePlaygroundLink(code, templates);
    if (run !== loadRun) return;
    const preset = state
      ? presets.find((preset) => preset.id === state.template)
      : code === undefined
        ? presets[0]
        : undefined;
    const files = state?.files;
    // A preset as it is keeps whatever config and theme are in the tab, so one config can be tried across them.
    const asIs =
      !!preset &&
      !!files &&
      Object.keys(files).length === 1 &&
      files[contentFile] === preset.source;
    if (files && !asIs) {
      configEditor.value = files[configFile] ?? defaultConfig;
      const sharedTheme = files[themeFile];
      let nextTheme = defaultTheme();
      if (sharedTheme !== undefined)
        try {
          nextTheme = readTheme(JSON.parse(sharedTheme));
        } catch {
          navigationIssues.push("The link's theme is not valid; using the default theme.");
        }
      setTheme(nextTheme);
    }
    const markdown = files
      ? (files[contentFile] ?? "")
      : code === undefined
        ? preset?.source
        : "The link's Markdown is cut off or changed.";
    loadIssues = navigationIssues;
    if (markdown !== undefined) editor.value = markdown;
    base = preset;
    reset.hidden = !preset || editor.value === preset.source;
    markPreset(reset.hidden ? preset?.id : undefined);
    revealPreset(preset?.id);
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
          replace(await link());
        } catch (error) {
          showIssues([errorText(error)]);
        }
        await render();
      }, 200);
    });
  share.addEventListener("click", async () => {
    try {
      replace(await link());
      await navigator.clipboard.writeText(location.href);
      share.textContent = "Copied";
      later(() => (share.textContent = "Copy link"), 1500);
    } catch (error) {
      showIssues([errorText(error)]);
    }
  });
  // Resetting drops edits that live nowhere else, so it asks first.
  reset.addEventListener("click", () => {
    confirmReset.returnValue = "";
    confirmReset.showModal();
  });
  confirmReset.addEventListener("close", async () => {
    if (confirmReset.returnValue !== "reset" || !base) return;
    try {
      location.hash = playgroundUrl("", await presetCode(base));
    } catch (error) {
      showIssues([errorText(error)]);
    }
  });
  copy.addEventListener("click", async () => {
    const shown = configEditor.closest<HTMLElement>(".play-code")?.hidden ? editor : configEditor;
    try {
      await navigator.clipboard.writeText(shown.value);
      copy.classList.add("copied");
      later(() => copy.classList.remove("copied"), 1200);
    } catch (error) {
      showIssues([errorText(error)]);
    }
  });
  addEventListener("hashchange", load, { signal });
  if (location.hash) await load();
  else {
    base = presets[0];
    markPreset(base?.id);
    await render();
  }
  void loadHighlight();
  return () => {
    stopped.abort();
    fitting.disconnect();
    nearing.disconnect();
    for (const id of [timer, themeTimer, ...pending]) clearTimeout(id);
  };
}
