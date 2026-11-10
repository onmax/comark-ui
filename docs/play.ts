// The playground's Comark side. PlaygroundRender runs the editor, presets, links, and preview; this renders its files
// with every plugin that runs in a browser, but not Shiki, which would triple the bundle, and fits the presets'
// stills. docs/app/pages/play/index.vue loads it on mount.
import { renderHtmlFromDocument } from "@comark/html";
import type {
  PlaygroundFiles,
  PlaygroundPreset,
  PlaygroundResult,
} from "@vite-hub/ui-playground/playground-render";
import { parseMarkdown } from "comark";
import { defaultConfig, readConfig } from "./config.ts";
import { readTheme } from "./play-theme.ts";
import { configFile, contentFile, themeFile } from "./play-link.ts";
import { browserPlugins, components } from "./plugins.ts";
import { errorText } from "../shared/text.ts";
export { playDocument } from "./preview.ts";

/** A preset as docs/tools.ts writes it to /play/presets.json: its files, its package, and its still. */
export interface Preset extends PlaygroundPreset {
  npm: string;
  still: string;
}

export async function render(files: PlaygroundFiles): Promise<PlaygroundResult> {
  const { config, issues: configIssues } = readConfig(files[configFile] ?? defaultConfig);
  const { issue: themeIssue } = readTheme(files[themeFile]);
  const issues = [...configIssues, ...(themeIssue ? [themeIssue] : [])];
  try {
    const parsed = await parseMarkdown(files[contentFile] ?? "", {
      plugins: browserPlugins(config, { download: false }),
    });
    const html = await renderHtmlFromDocument(parsed, { components });
    return { html, issues: [...issues, ...parsed.meta.issues].map((message) => ({ message })) };
  } catch (error) {
    return { html: "", issues: [...issues, errorText(error)].map((message) => ({ message })) };
  }
}

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

/**
 * Fits the stills in `column` as they near the screen, and scrolls the column to the open preset when it is out of
 * view, as a package's "Open in playground" lands far down it. Returns what stops both.
 */
export function watchPresets(column: HTMLElement): () => void {
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
  for (const thumb of column.querySelectorAll(".preset-thumb")) nearing.observe(thumb);

  // One already in view stays put, so a click in the column doesn't move it.
  function reveal() {
    const card = column.querySelector<HTMLElement>("[aria-current='true']");
    if (!card || !column.clientHeight) return;
    const top = card.getBoundingClientRect().top - column.getBoundingClientRect().top;
    if (top >= 0 && top + card.offsetHeight <= column.clientHeight) return;
    column.scrollTop += top - (column.clientHeight - card.offsetHeight) / 2;
  }
  const current = new MutationObserver(reveal);
  current.observe(column, { subtree: true, attributeFilter: ["aria-current"] });
  reveal();
  return () => {
    fitting.disconnect();
    nearing.disconnect();
    current.disconnect();
  };
}
