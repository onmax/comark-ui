// What each package tells an editor about the blocks a document writes, keyed by the name as written (`embed` for
// `::embed`). It's plain data, so a server can pass it on, such as to ViteHub's `documents({ components })`, and
// comark-ui's `ComarkEditor` takes it as its `components`.

/** One prop of a block. */
export interface ComponentProp {
  /** How the value is written: a string as is (`title="Q3"`), the others with Comark's `:` prefix (`:start="90"`). */
  type: "string" | "number" | "boolean" | "json";
  description?: string;
  /** What the block uses when the prop is left out. */
  default?: string | number | boolean;
  /** The values a string takes. */
  options?: readonly string[];
}

/** One block a document can write. */
export interface ComponentInfo {
  /** `block` is written `::name` to `::`; `inline` sits in text, as `:name[text]`. */
  kind: "block" | "inline";
  label: string;
  /** One sentence: what the block shows. */
  description: string;
  props?: Record<string, ComponentProp>;
  /** The named slots, such as `summary` for `#summary`, with what each holds. The content is the default slot. */
  slots?: Record<string, string>;
}
