import type { ComarkPlugin } from "comark";
import type { CastOptions } from "comark-cast";
import type { ChartsOptions } from "comark-charts";
import type { ChipsOptions } from "comark-chips";
import cjk from "comark-cjk";
import type { CodeOptions } from "comark-code";
import critic, { type CriticOptions } from "comark-critic";
import deflist from "comark-deflist";
import type { DetailsOptions } from "comark-details";
import type { DiagramsOptions } from "comark-diagrams";
import figure, { type FigureOptions } from "comark-figure";
import type { FileTreeOptions } from "comark-file-tree";
import footnotes, { type FootnotesOptions } from "comark-footnotes";
import type { CalloutsOptions, ReferencesOptions } from "comark-github";
import { createIcons, type IconOptions, type Icons } from "comark-icon";
import include, { type IncludeOptions } from "comark-include";
import keys, { type KeysOptions } from "comark-keys";
import type { AnchorsOptions, ExternalOptions } from "comark-links";
import type { MediaOptions } from "comark-media";
import type { PeleConfig } from "comark-pele";
import type { PropertiesOptions } from "comark-properties";
import type { QuizOptions } from "comark-quiz";
import readingTime, { type ReadingTimeOptions } from "comark-reading-time";
import type { TableOptions } from "comark-table";
import type { TabsOptions } from "comark-tabs";
import type { TestsOptions } from "comark-tests";
import xref, { type XrefOptions } from "comark-xref";
import type { ZoomOptions } from "comark-zoom";

/** comark-critic's styles. It has no component to add them, so put them in the page yourself. */
export { css as criticCss } from "comark-critic";

/**
 * `false` turns a plugin off, and an object turns it on with those options. Everything but `include` is on, and cast,
 * table, and tests read no files until they get options.
 */
export type PresetOptions = {
  /** Pastes files into the Markdown before the other plugins read it. Off, since it reads from disk by default. */
  include?: IncludeOptions | boolean;
  /** HTML only: Vue, React, and Svelte have no annotate components. */
  annotate?: boolean;
  carousel?: boolean;
  /** Reads no cast files unless you pass `{ root }` or `{ read }`; inline casts render either way. */
  cast?: CastOptions | boolean;
  cjk?: boolean;
  deflist?: boolean;
  figure?: FigureOptions | boolean;
  critic?: CriticOptions | boolean;
  charts?: ChartsOptions | boolean;
  /** Pass `{ download: false }` when parsing in a browser, which may not download another site's images. */
  chips?: ChipsOptions | boolean;
  colors?: boolean;
  /** Sends each diagram's source to `https://kroki.io` unless you pass your own `server`, or `{ draw: false }`. */
  diagrams?: DiagramsOptions | boolean;
  /** Draws `mermaid` fences with comark-pele, on the server and offline. */
  mermaid?: PeleConfig | boolean;
  /** HTML only: Vue, React, and Svelte have no diff components. */
  diff?: boolean;
  embed?: boolean;
  footnotes?: FootnotesOptions | boolean;
  github?:
    | {
        callouts?: CalloutsOptions | boolean;
        references?: ReferencesOptions | boolean;
        html?: boolean;
      }
    | boolean;
  /** Also resolves the icons of cards, details, file trees, tabs, and code actions, so they share its options. */
  icon?: IconOptions | boolean;
  mark?: boolean;
  details?: DetailsOptions | boolean;
  links?: { external?: ExternalOptions | boolean; anchors?: AnchorsOptions | boolean } | boolean;
  fileTree?: FileTreeOptions | boolean;
  fields?: boolean;
  properties?: PropertiesOptions | boolean;
  /** HTML only: Vue, React, and Svelte have no quiz components. */
  quiz?: QuizOptions | boolean;
  keys?: KeysOptions | boolean;
  badge?: boolean;
  media?: MediaOptions | boolean;
  metrics?: boolean;
  /** Reads no data files unless you pass `{ root }` or `{ read }`; CSV fences render either way. */
  table?: TableOptions | boolean;
  cards?: boolean;
  qr?: boolean;
  sources?: boolean;
  steps?: boolean;
  readingTime?: ReadingTimeOptions | boolean;
  tabs?: TabsOptions | boolean;
  outline?: boolean;
  xref?: XrefOptions | boolean;
  /** Reads no JUnit reports unless you pass `{ root }` or `{ read }`; inline reports render either way. */
  tests?: TestsOptions | boolean;
  zoom?: ZoomOptions | boolean;
  code?: CodeOptions | boolean;
  codeNotes?: boolean;
};

// oxlint-disable-next-line no-explicit-any -- each plugin types its own meta, as in Comark's ParserOptions.
export type AnyPlugin = ComarkPlugin<any, any>;
// A package's renderer entry, which exports the parse plugin as `default` beside its `components`.
type Part<C, O = void> = { default: (options?: O) => AnyPlugin; components: Record<string, C> };

/** One renderer's entry of each package with components, by the option that turns it on. */
export type Renderer<C> = {
  annotate?: Part<C>;
  carousel: Part<C>;
  cast: Part<C, CastOptions>;
  charts: Part<C, ChartsOptions>;
  chips: Part<C, ChipsOptions>;
  colors: Part<C>;
  diagrams: Part<C, DiagramsOptions>;
  mermaid: Part<C, PeleConfig>;
  diff?: Part<C>;
  embed: Part<C>;
  github: {
    callouts: (options?: CalloutsOptions) => AnyPlugin;
    references: (options?: ReferencesOptions) => AnyPlugin;
    html: () => AnyPlugin;
    components: Record<string, C>;
  };
  icon: Part<C, IconOptions | Icons>;
  details: Part<C, DetailsOptions>;
  links: {
    external: (options?: ExternalOptions) => AnyPlugin;
    anchors: (options?: AnchorsOptions) => AnyPlugin;
    components: Record<string, C>;
  };
  fileTree: Part<C, FileTreeOptions>;
  fields: Part<C>;
  properties: Part<C, PropertiesOptions>;
  quiz?: Part<C, QuizOptions>;
  badge: Part<C>;
  mark: Part<C>;
  media: Part<C, MediaOptions>;
  metrics: Part<C>;
  table: Part<C, TableOptions>;
  cards: Part<C, { iconResolver?: Icons }>;
  qr: Part<C>;
  sources: Part<C>;
  steps: Part<C>;
  tabs: Part<C, TabsOptions>;
  outline: Part<C>;
  tests: Part<C, TestsOptions>;
  zoom: Part<C, ZoomOptions>;
  code: Part<C, CodeOptions>;
  codeNotes: Part<C>;
};

export type Preset<C> = { plugins: AnyPlugin[]; components: Record<string, C> };

const on = (value: unknown, fallback = true) => (value === undefined ? fallback : value !== false);
const optionsOf = <T>(value: T | boolean | undefined): T | undefined =>
  value === true || value === false ? undefined : value;
// What cast, table, and tests read when they get no options: no file, so a document can't pull one off the disk.
const noFiles = { read: () => undefined };

/** Builds a renderer's preset. Use the one from `comark-ui/html`, `/vue`, `/react`, or `/svelte`. */
export function preset<C>(renderer: Renderer<C>, options: PresetOptions = {}): Preset<C> {
  const plugins: AnyPlugin[] = [];
  const components: Record<string, C> = {};
  const add = <O>(
    part: Part<C, O> | undefined,
    value: O | boolean | undefined,
    settings = optionsOf(value),
  ) => {
    if (!part || !on(value)) return;
    plugins.push(part.default(settings));
    Object.assign(components, part.components);
  };
  const parse = <O>(plugin: (options?: O) => AnyPlugin, value: O | boolean | undefined) => {
    if (on(value)) plugins.push(plugin(optionsOf(value)));
  };
  const icons = createIcons(optionsOf(options.icon));

  // The order is the one the docs site renders with. Include goes first, so the others read what it pastes, and
  // code goes late, after every plugin that writes code blocks.
  if (on(options.include, false)) plugins.push(include(optionsOf(options.include)));
  add(renderer.annotate, options.annotate);
  add(renderer.carousel, options.carousel);
  add(renderer.cast, options.cast, optionsOf(options.cast) ?? noFiles);
  parse(cjk, options.cjk);
  parse(deflist, options.deflist);
  parse(figure, options.figure);
  parse(critic, options.critic);
  add(renderer.charts, options.charts);
  add(renderer.chips, options.chips);
  add(renderer.colors, options.colors);
  add(renderer.diagrams, options.diagrams);
  add(renderer.mermaid, options.mermaid);
  add(renderer.diff, options.diff);
  add(renderer.embed, options.embed);
  parse(footnotes, options.footnotes);
  if (on(options.github)) {
    const github = optionsOf(options.github) ?? {};
    if (on(github.callouts)) {
      plugins.push(renderer.github.callouts(optionsOf(github.callouts)));
      Object.assign(components, renderer.github.components);
    }
    if (on(github.references))
      plugins.push(renderer.github.references(optionsOf(github.references)));
    if (on(github.html)) plugins.push(renderer.github.html());
  }
  add(renderer.icon, options.icon, icons);
  add(renderer.mark, options.mark);
  add(renderer.details, options.details, { iconResolver: icons, ...optionsOf(options.details) });
  if (on(options.links)) {
    const links = optionsOf(options.links) ?? {};
    if (on(links.external)) plugins.push(renderer.links.external(optionsOf(links.external)));
    if (on(links.anchors)) plugins.push(renderer.links.anchors(optionsOf(links.anchors)));
    // Headings draw the anchors, and the rest the new-tab warning, so either plugin needs them.
    if (on(links.external) || on(links.anchors))
      Object.assign(components, renderer.links.components);
  }
  add(renderer.fileTree, options.fileTree, { iconResolver: icons, ...optionsOf(options.fileTree) });
  add(renderer.fields, options.fields);
  add(renderer.properties, options.properties);
  parse(keys, options.keys);
  add(renderer.badge, options.badge);
  add(renderer.media, options.media);
  add(renderer.metrics, options.metrics);
  add(renderer.table, options.table, optionsOf(options.table) ?? noFiles);
  add(renderer.cards, options.cards, { iconResolver: icons });
  add(renderer.qr, options.qr);
  add(renderer.sources, options.sources);
  add(renderer.steps, options.steps);
  add(renderer.quiz, options.quiz);
  parse(readingTime, options.readingTime);
  add(renderer.tabs, options.tabs, { iconResolver: icons, ...optionsOf(options.tabs) });
  add(renderer.outline, options.outline);
  parse(xref, options.xref);
  add(renderer.tests, options.tests, optionsOf(options.tests) ?? noFiles);
  add(renderer.zoom, options.zoom);
  add(renderer.code, options.code, { iconResolver: icons, ...optionsOf(options.code) });
  add(renderer.codeNotes, options.codeNotes);
  return { plugins, components };
}
