import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageRegistration,
  type ThemeRegistrationAny,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/** A dynamic import, such as `() => import("shiki/langs/typescript.mjs")`. */
export type Loader<T extends object> = () => Promise<T | { default: T }>;

export type LazyHighlighterOptions = {
  /** The grammars a fence may use, keyed by Shiki's name for each. Each one loads the first time a fence asks for it. */
  languages: Record<string, Loader<LanguageRegistration[]>>;
  /** More names a fence may use for a language, such as `{ ts: "typescript" }`. */
  aliases?: Record<string, string>;
  /** The themes code is colored with. `dark` goes in `--shiki-dark`. Both load with the first grammar. */
  themes: { light: Loader<ThemeRegistrationAny>; dark?: Loader<ThemeRegistrationAny> };
};

export type LazyHighlighter = {
  /** Shiki with `language`'s grammar loaded, or `undefined` for a language it doesn't have. */
  highlighter: (language: string) => Promise<HighlighterCore | undefined>;
  /** The names `highlighter`'s themes are loaded under. */
  themes: { light: string; dark?: string };
  /** The names in `languages`. */
  languages: string[];
  /** The name in `languages` that a fence's info string, or one of `aliases`, stands for. */
  language: (info: string | null | undefined) => string | undefined;
};

const unwrap = async <T extends object>(load: Loader<T>): Promise<T> => {
  const module = await load();
  // SAFETY: a theme is an object without `default`, and a grammar is an array, so `default` marks a module.
  return "default" in module ? (module.default as T) : module;
};

/**
 * A Shiki with the JavaScript regex engine, so it needs no WebAssembly and runs on Workers and in browsers, that loads
 * each grammar the first time a fence uses it. Pass the result as the preset's `shiki`.
 */
export function createLazyHighlighter(options: LazyHighlighterOptions): LazyHighlighter {
  const { languages, aliases = {} } = options;
  // Each theme loads under its role's name, so `themes` is known before any theme has loaded.
  const themes = options.themes.dark ? { light: "light", dark: "dark" } : { light: "light" };
  let core: Promise<HighlighterCore> | undefined;
  const loading = new Map<string, Promise<void>>();

  const language = (info: string | null | undefined) => {
    const name = info?.trim().split(/\s/, 1)[0]?.toLowerCase();
    if (!name) return undefined;
    const target = Object.hasOwn(aliases, name) ? aliases[name] : name;
    return target && Object.hasOwn(languages, target) ? target : undefined;
  };

  const load = () =>
    (core ??= Promise.all(
      Object.entries(options.themes).flatMap(([role, theme]) =>
        theme ? [unwrap(theme).then((loaded) => ({ ...loaded, name: role }))] : [],
      ),
    )
      .then((loaded) =>
        createHighlighterCore({
          themes: loaded,
          langs: [],
          langAlias: aliases,
          engine: createJavaScriptRegexEngine(),
        }),
      )
      .then((shiki): HighlighterCore => ({
        ...shiki,
        codeToTokens(code, options) {
          return shiki.codeToTokens(code, {
            ...options,
            lang: language(options.lang) ?? options.lang,
          });
        },
      }))
      .catch((error: unknown) => {
        // A chunk the network dropped loads again on the next call.
        core = undefined;
        throw error;
      }));

  return {
    themes,
    languages: Object.keys(languages),
    language,
    async highlighter(info) {
      const name = language(info);
      const loader = name && languages[name];
      if (!name || !loader) return undefined;
      const shiki = await load();
      let grammar = loading.get(name);
      if (!grammar) {
        grammar = unwrap(loader).then((grammars) => shiki.loadLanguage(...grammars));
        loading.set(name, grammar);
        grammar.catch(() => loading.delete(name));
      }
      await grammar;
      return shiki;
    },
  };
}
