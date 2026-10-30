import { defineComarkPlugin } from "comark";
import cjk from "comark-cjk";
import critic from "comark-critic";
import deflist from "comark-deflist";
import footnotes from "comark-footnotes";
import {
  addRule,
  type MarkdownExit,
  SPAN,
  type StateInline,
  type Token,
} from "../../../../shared/markdown-it.ts";

/** The element around the two halves of `{~~old~>new~~}`, which comark-critic writes as a `del` beside an `ins`. */
export const SUBSTITUTION = "critic-sub";

// While the rule below tokenizes a substitution's own text, so comark-critic's rule reads its opener instead.
let inside = false;

// comark-critic writes `{~~old~>new~~}` and `{--old--}{++new++}` as the same two nodes, so this wraps a substitution to
// write it back as the author did. Its silent pass finds the end without pushing tokens.
function substitution(state: StateInline, silent: boolean) {
  if (silent || inside || !state.src.startsWith("{~~", state.pos)) return false;
  const start = state.pos;
  const max = state.posMax;
  const rules = state.md.inline.ruler.getRules("");
  const criticRule = rules[rules.indexOf(substitution) + 1];
  if (!criticRule?.(state, true)) return false;
  const end = state.pos;
  state.pos = start;
  state.push(`${SPAN}_open`, SUBSTITUTION, 1);
  state.posMax = end;
  inside = true;
  try {
    state.md.inline.tokenize(state);
  } finally {
    inside = false;
  }
  state.posMax = max;
  state.push(`${SPAN}_close`, SUBSTITUTION, -1);
  return true;
}

const substitutions = defineComarkPlugin(() => ({
  name: "editor-critic-substitutions",
  markdownItPlugins: [
    (md: MarkdownExit) =>
      addRule(md.inline.ruler, "before", ["critic"], "critic_substitution", substitution),
  ],
}));

// comark-footnotes' own rules mark definitions, references, and inline notes with their labels; its `post` would
// number them, and numbers can't be written back as the labels an author picked.
const footnoteMarkers = defineComarkPlugin(() => ({
  name: "editor-footnotes",
  markdownItPlugins: footnotes().markdownItPlugins,
}));

// Comark's alert plugin reads a callout's title into its first paragraph, so the title couldn't be told from a first
// line. Without it, `> [!NOTE] Title` stays a quote that opens with a `[!NOTE]` span and writes back unchanged.
const noAlert = defineComarkPlugin(() => ({ name: "alert" }));

/** The prop on a component written `:name{props}` alone on its line, which Comark reads like an empty `::name`. */
export const SHORTHAND = "data-comark-editor-shorthand";

function markShorthands(tokens: Token[]) {
  for (const token of tokens) {
    if (token.type === "mdc_block_shorthand" || token.type === "mdc_block_shorthand_open")
      token.attrSet(SHORTHAND, "");
    if (token.children) markShorthands(token.children);
  }
}

const shorthands = defineComarkPlugin(() => ({
  name: "editor-shorthands",
  // SAFETY: Comark parses with markdown-exit, whose tokens have this shape; it types them as unknown.
  markdownItPost: (state) => markShorthands(state.tokens as Token[]),
}));

/**
 * The syntax the codec reads beyond Comark's own: CriticMarkup, definition lists, footnotes, and emphasis next to CJK
 * punctuation. Each would otherwise reach the tree as text, or not at all, and be written back escaped or dropped.
 * It also marks the components written `:name` alone on their line, so they're written back that way.
 */
export const syntax = [
  noAlert(),
  critic(),
  substitutions(),
  deflist(),
  cjk(),
  footnoteMarkers(),
  shorthands(),
];
