// Colors the playground's editors: the Markdown with Comark's own grammar, the one the docs' code blocks get from the
// Shiki plugin, and the config as JSON. The JavaScript regex engine keeps WebAssembly out of the page.
import { comarkLanguages } from "comark/plugins/shiki/language-comark";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import json from "shiki/langs/json.mjs";
import dark from "shiki/themes/github-dark-default.mjs";
import light from "shiki/themes/github-light-high-contrast.mjs";

const highlighter = await createHighlighterCore({
  themes: [light, dark],
  langs: [...comarkLanguages, json],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
});

export const highlight = (code: string, lang: "mdc" | "json" = "mdc") =>
  highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light-high-contrast", dark: "github-dark-default" },
  });
