// The plugins that run in a browser, shared by the static pages and the playground so both render alike: the preset,
// so the site shows what it gives. comark-include reads files and comark-linter is a checker, so they're left out, and
// the preset's cast, table, and tests read no files, which a browser doesn't have.
import comarkUi from "../packages/ui/src/html.ts";
import type { PlayConfig } from "./config.ts";

// Google's favicon service has none for this site, which only declares an SVG icon, so its chips would look like code.
const favicon = (host: string) =>
  host === "comark-ui.onmax.me"
    ? "https://comark-ui.onmax.me/favicon.svg"
    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;

// `download` is off in a browser, which may not download another site's images, so the reader's loads them as links.
export const browserPlugins = (config: PlayConfig = {}, { download = true } = {}) =>
  comarkUi({
    chips: { download, favicon },
    code: config["comark-code"],
    github: config["comark-github"],
    links: config["comark-links"],
    zoom: config["comark-zoom"],
  }).plugins;

export const { components } = comarkUi();
