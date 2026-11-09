// The playground's state is files: the Markdown in `content.md`, and `config.json` and `theme.json` when they aren't
// the defaults. A link carries them in the hash through @vite-hub/ui/playground, so nothing is stored anywhere. A
// preset is a template, so a link to it holds only its id and what changed. The pages' examples, the playground, and
// the gallery all write links, in the browser or on the server.
import {
  encodePlaygroundLink,
  playgroundUrl,
  type PlaygroundTemplate,
} from "@vite-hub/ui/playground";

export const contentFile = "content.md";
export const configFile = "config.json";
export const themeFile = "theme.json";

/** An include reads files, so the playground can't run it. */
export const playable = (source: string) => !/^:+include\b/m.test(source);

export const templateOf = (preset: { id: string; source: string }): PlaygroundTemplate => ({
  id: preset.id,
  files: { [contentFile]: preset.source },
});

/** The code of a link that opens the preset as it is. */
export const presetCode = (preset: { id: string; source: string }) => {
  const { id, files } = templateOf(preset);
  return encodePlaygroundLink({ template: id, files }, files);
};

/** A link that opens `source` in the playground, with the default config and theme. */
export const playLink = async (source: string) =>
  playgroundUrl("/play", await encodePlaygroundLink({ files: { [contentFile]: source } }));
