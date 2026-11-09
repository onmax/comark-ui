// The playground's state is files: the Markdown in `content.md`, the options in `config.json`, and the Theme pane's
// `theme.json`. A link carries them in the hash through @vite-hub/ui/playground, so nothing is stored anywhere. A
// preset is a template with the default config and theme, so a link to it holds only its id and what changed. The
// pages' examples, the playground, and the gallery all write links, in the browser or on the server.
import {
  encodePlaygroundLink,
  playgroundUrl,
  type PlaygroundTemplate,
} from "@vite-hub/ui/playground";
import { defaultConfig } from "./config.ts";
import { defaultThemeText } from "./play-theme.ts";

export const contentFile = "content.md";
export const configFile = "config.json";
export const themeFile = "theme.json";

/** An include reads files, so the playground can't run it. */
export const playable = (source: string) => !/^:+include\b/m.test(source);

export const templateOf = (preset: { id: string; source: string }): PlaygroundTemplate => ({
  id: preset.id,
  files: {
    [contentFile]: preset.source,
    [configFile]: defaultConfig,
    [themeFile]: defaultThemeText,
  },
});

/** The code of a link that opens the preset as it is. */
export const presetCode = (preset: { id: string; source: string }) => {
  const { id, files } = templateOf(preset);
  return encodePlaygroundLink({ template: id, files }, files);
};

/** A link that opens `source` in the playground, with the default config, so the Config pane shows it, and theme. */
export const playLink = async (source: string) =>
  playgroundUrl(
    "/play",
    await encodePlaygroundLink({ files: { [contentFile]: source, [configFile]: defaultConfig } }),
  );
