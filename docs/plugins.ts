// The plugins that run in a browser, shared by the static pages and the playground so both render alike: the preset,
// so the site shows what it gives. comark-include reads files and comark-linter is a checker, so they're left out, and
// the preset's cast, table, and tests read no files, which a browser doesn't have. bundle reads its examples' reports
// from memory.
import comarkUi from "../packages/ui/src/html.ts";
import type { IconOptions } from "comark-icon";
import { avatars } from "./avatars.ts";
import main from "../packages/bundle/test/fixtures/sonda/main.json" with { type: "json" };
import pr from "../packages/bundle/test/fixtures/sonda/pr.json" with { type: "json" };
import type { PlayConfig } from "./config.ts";

// The bundle examples compare two Sonda reports of a made-up dashboard, read from memory since a browser has no disk.
const reports: Record<string, unknown> = { "reports/main.json": main, "reports/pr.json": pr };
const bundle = {
  read: (path: string) => (reports[path] ? JSON.stringify(reports[path]) : undefined),
  list: () => undefined,
};

// Google's favicon service has none for this site, which only declares an SVG icon, so its chips would look like code.
const favicon = (host: string) =>
  host === "comark-ui.onmax.me"
    ? "https://comark-ui.onmax.me/favicon.svg"
    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;

// `download` is off in a browser, which may not download another site's images, so the reader's loads them as links.
export const browserPlugins = (
  config: PlayConfig = {},
  {
    download = true,
    icon,
    typeset,
  }: { download?: boolean; icon?: IconOptions; typeset?: boolean } = {},
) =>
  comarkUi({
    typeset,
    badge: { download },
    chips: { download, favicon },
    icon,
    code: config["comark-code"],
    comments: { avatars },
    bundle,
    github: config["comark-github"],
    links: config["comark-links"],
    time: config["comark-time"],
    zoom: config["comark-zoom"],
  }).plugins;

export const { components } = comarkUi();
