/** What a formula is typeset as: MathML through Temml, or KaTeX's HTML, alone or with its MathML. */
export type MathOutput = "mathml" | "html" | "htmlAndMathml";

/** A formula's markup, or why it couldn't be typeset. */
export type Typeset = { html: string } | { reason: string };

type Render = (tex: string, display: boolean) => string;

// Every engine gets the same limits, so a formula can't expand forever, draw a page-sized rule, or run a link.
const LIMITS = { throwOnError: true, trust: false, maxExpand: 1000 } as const;
const MAX_SIZE = 20;

/** The reason in a parse error, without the engine's prefix or the excerpt of the formula after it. */
function reasonOf(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  return error.message
    .replace(/^\s*(?:KaTeX|Temml) parse error:\s*/i, "")
    .replace(/ at (?:position \d+|end of input):[\s\S]*$/, "")
    .trim()
    .replace(/\.$/, "");
}

const temml = (macros: Record<string, string>) =>
  import("temml").then(
    ({ default: engine }): Render =>
      (tex, display) =>
        engine.renderToString(tex, {
          ...LIMITS,
          displayMode: display,
          // Keeps the TeX in the MathML, where copying and screen readers can find it.
          annotate: true,
          // Temml's limit is in ems, then in points.
          maxSize: [MAX_SIZE, MAX_SIZE * 10],
          // Temml writes `\gdef` into the object it's given.
          macros: { ...macros },
        }),
  );

// KaTeX is an optional peer. The specifier is a variable so that bundlers leave it alone instead of failing to resolve
// it; in a browser bundle the import fails, and formulas are typeset as MathML.
const KATEX = "katex";
const katex = (output: "html" | "htmlAndMathml", macros: Record<string, string>) =>
  // SAFETY: KATEX is the literal "katex", so the module is KaTeX whenever the import succeeds.
  (import(/* @vite-ignore */ KATEX) as Promise<typeof import("katex")>).then(
    ({ default: engine }): Render =>
      (tex, display) =>
        engine.renderToString(tex, {
          ...LIMITS,
          displayMode: display,
          output,
          maxSize: MAX_SIZE,
          macros: { ...macros },
        }),
    () => undefined,
  );

// Every formula by engine, options, and TeX, across parses and instances, so a site that builds many pages typesets
// each once. Errors are kept too, since the same TeX fails the same way. The oldest go first past the limit.
const cache = new Map<string, Typeset>();
const LIMIT = 2000;

function remember(key: string, result: Typeset) {
  if (cache.size >= LIMIT) cache.delete(cache.keys().next().value ?? "");
  cache.set(key, result);
  return result;
}

/**
 * Loads the engine for `output` and returns a function that typesets one formula and never throws. `missing` is set
 * when `output` needs KaTeX and it isn't installed; formulas are then typeset as MathML.
 */
export async function typesetter(output: MathOutput, macros: Record<string, string>) {
  const wanted = output === "mathml" ? undefined : await katex(output, macros);
  const missing = output !== "mathml" && !wanted;
  const engine = wanted ?? (await temml(macros));
  const prefix = `${missing ? "mathml" : output}\n${JSON.stringify(macros)}\n`;
  const typeset = (tex: string, display: boolean): Typeset => {
    const key = `${prefix}${display ? "display" : "inline"}\n${tex}`;
    const known = cache.get(key);
    if (known) {
      cache.delete(key);
      return remember(key, known);
    }
    try {
      return remember(key, { html: engine(tex, display) });
    } catch (error) {
      return remember(key, { reason: reasonOf(error) });
    }
  };
  return { typeset, missing };
}
