import type { NodeViewRenderer } from "@tiptap/core";
import {
  NodeViewContent,
  nodeViewProps,
  NodeViewWrapper,
  VueNodeViewRenderer,
} from "@tiptap/vue-3";
import { theme } from "comark-zoom/theme";
import {
  type Component,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
} from "vue";
import { addStyles } from "../../../../shared/styles.ts";

/** One prop a component takes, as the props panel edits it. */
export interface ComponentProp {
  /**
   * `string` (the default), `number`, `boolean`, or `json`, each with its own field. Any other name, such as `image`,
   * reads and writes a string and is the `field` hook's to draw.
   */
  type?: "string" | "number" | "boolean" | "json" | (string & {});
  label?: string;
  description?: string;
  /** What the component uses when the prop is left out. The field shows it and doesn't write it. */
  default?: unknown;
  /** The values a string takes, drawn as a select. */
  options?: readonly string[];
}

/** What the editor shows for one component name. */
export interface ComponentInfo {
  /** Shown instead of the name. The name stays beside it. */
  label?: string;
  /** A class for an icon element, such as UnoCSS's `i-lucide-chart-bar`, or a Vue component. */
  icon?: string | Component;
  /** The props the panel edits with typed fields. Props a document has beyond these show as names and values. */
  props?: Record<string, ComponentProp>;
}

/** A field of the props panel, given to `field` so a host can draw its own control, such as a media picker. */
export interface ComponentField {
  /** The component's name, such as `card`. */
  component: string;
  /** The prop's name, such as `icon`. */
  name: string;
  prop: ComponentProp;
  /** The prop's value read as its type, or `undefined` when the document leaves it out. */
  value: unknown;
  /** Sets the prop through a transaction. `undefined` removes it. */
  update(value: unknown): void;
  editable: boolean;
  /** The id the field's label points at. */
  id: string;
}

export interface ComponentViewOptions {
  /** What to show for each component name. A component that isn't listed shows its name and edits props as text. */
  components?: Record<string, ComponentInfo>;
  /** Draws a typed field. Return `undefined` for the panel's own field. */
  field?: (field: ComponentField) => VNodeChild | undefined;
}

type Props = Record<string, unknown>;

// Comark keeps `name="text"` as text under `name`, and `:name="value"` under `:name`, as text for a number or a boolean
// and parsed for an object or an array.
function readProp(props: Props, name: string, type: string): unknown {
  if (Object.hasOwn(props, name)) {
    const value = props[name];
    if (type === "boolean") return value !== "false";
    if (type === "number") return value === "" ? undefined : Number(value);
    return value;
  }
  const bound = props[`:${name}`];
  if (bound === undefined) return undefined;
  const parsed = isString(bound) ? parse(bound) : bound;
  if (type === "boolean") return parsed === true || parsed === "true";
  if (type === "number") return Number(parsed);
  if (type === "json") return parsed;
  return isString(parsed) ? parsed : JSON.stringify(parsed);
}

const isString = (value: unknown): value is string => String(value) === value;

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Writes `value` in place of the prop under either key, keeping the props' order. Strings go under `name`, every
// other value under `:name` as JSON text, which Comark writes on one line, inline components included.
function writeProp(props: Props, name: string, value: unknown): Props | undefined {
  const key = value === undefined || isString(value) ? name : `:${name}`;
  const next: Props = {};
  let placed = value === undefined;
  for (const [current, old] of Object.entries(props)) {
    if (current !== name && current !== `:${name}`) next[current] = old;
    else if (!placed) {
      next[key] = isString(value) ? value : JSON.stringify(value);
      placed = true;
    }
  }
  if (!placed) next[key] = isString(value) ? value : JSON.stringify(value);
  return Object.keys(next).length ? next : undefined;
}

// The text of the field an event came from.
const valueOf = (event: Event) =>
  event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
    ? event.target.value
    : "";

const shown = (value: unknown) => (isString(value) ? value : JSON.stringify(value));

// The props panel and the bar of the block hold controls, so the editor leaves their events to the browser.
const CHROME = "data-cev-chrome";
const stopEvent = ({ event }: { event: Event }) =>
  event.target instanceof Element && event.target.closest(`[${CHROME}]`) !== null;

let count = 0;

/** Places an open panel under its button, or above it when there's no room below, inside the viewport. */
function place(panel: HTMLElement, anchor: HTMLElement) {
  const box = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = panel;
  const below = box.bottom + 4 + height <= innerHeight || box.top < height + 4;
  panel.style.top = `${below ? box.bottom + 4 : box.top - height - 4}px`;
  panel.style.left = `${Math.max(8, Math.min(box.left, innerWidth - width - 8))}px`;
}

function icon(info: ComponentInfo | undefined): VNode | null {
  if (!info?.icon) return null;
  return isString(info.icon)
    ? h("span", { class: ["cev-icon", info.icon], "aria-hidden": "true" })
    : h(info.icon, { class: "cev-icon", "aria-hidden": "true" });
}

const ComponentView = defineComponent({
  name: "ComarkComponentView",
  props: {
    ...nodeViewProps,
    // SAFETY: Vue's runtime constructor cannot express the options object's type.
    options: { type: Object as PropType<ComponentViewOptions>, required: true },
  },
  setup(props) {
    const id = `cev-${++count}`;
    const button = ref<HTMLElement>();
    const panel = ref<HTMLElement>();
    // `isEditable` isn't reactive, so the panel reads it each time it opens.
    const editable = ref(props.editor.isEditable);
    const adding = ref({ key: "", value: "" });
    // JSON commits on change, so document transactions must leave even an incomplete draft intact.
    const drafts = ref(new Map<string, string>());

    const reposition = () => {
      if (panel.value && button.value && panel.value.matches(":popover-open"))
        place(panel.value, button.value);
    };
    function toggle() {
      if (!panel.value?.matches(":popover-open")) return;
      editable.value = props.editor.isEditable;
      reposition();
      panel.value?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    }
    onMounted(() => {
      addStyles("editor-component-view", componentViewCss);
      addEventListener("scroll", reposition, true);
      addEventListener("resize", reposition);
    });
    onBeforeUnmount(() => {
      removeEventListener("scroll", reposition, true);
      removeEventListener("resize", reposition);
    });

    const setProps = (update: (current: Props) => Props | undefined) => {
      // A host field can keep its callback while a picker is open and other props change.
      if (props.editor.isEditable)
        props.updateAttributes({ props: update(props.node.attrs.props ?? {}) ?? null });
    };

    return () => {
      const { node, options } = props;
      const name = String(node.attrs.name);
      const current: Props = node.attrs.props ?? {};
      const inline = node.isInline;
      // Raw HTML parses to a component with its markup in `$`, which Comark's HTML writer owns.
      const html = current.$ instanceof Object;
      const info = options.components?.[name];
      const schema = info?.props ?? {};
      const typed = Object.keys(schema);
      const rest = Object.keys(current).filter(
        (key) => key !== "$" && !typed.includes(key.replace(/^:/, "")),
      );
      const can = editable.value;

      function typedField(prop: string) {
        const spec = schema[prop]!;
        const type = spec.type ?? "string";
        const value = readProp(current, prop, type);
        const fieldId = `${id}-${prop}`;
        const update = (next: unknown) => setProps((current) => writeProp(current, prop, next));
        const custom = options.field?.({
          component: name,
          name: prop,
          prop: spec,
          value,
          update,
          editable: can,
          id: fieldId,
        });
        const placeholder = spec.default === undefined ? undefined : shown(spec.default);
        let control: VNodeChild;
        if (custom !== undefined) control = custom;
        else if (type === "boolean")
          control = h("input", {
            id: fieldId,
            type: "checkbox",
            checked: value ?? spec.default === true,
            disabled: !can,
            onChange: (event: Event) => {
              const checked = event.target instanceof HTMLInputElement && event.target.checked;
              update(checked || spec.default === true ? checked : undefined);
            },
          });
        else if (spec.options)
          control = h(
            "select",
            {
              id: fieldId,
              value: value ?? "",
              disabled: !can,
              onChange: (event: Event) => update(valueOf(event) || undefined),
            },
            [
              h("option", { value: "" }, placeholder ? `Default (${placeholder})` : "—"),
              ...spec.options.map((option) => h("option", { value: option }, option)),
            ],
          );
        else if (type === "json")
          control = h("textarea", {
            id: fieldId,
            class: "cev-code",
            rows: 3,
            value: drafts.value.get(prop) ?? (value === undefined ? "" : JSON.stringify(value)),
            placeholder,
            disabled: !can,
            spellcheck: false,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLTextAreaElement)
                drafts.value.set(prop, event.target.value);
            },
            onChange: (event: Event) => {
              const target = event.target;
              if (!(target instanceof HTMLTextAreaElement)) return;
              try {
                update(target.value.trim() ? JSON.parse(target.value) : undefined);
                drafts.value.delete(prop);
                target.removeAttribute("aria-invalid");
              } catch {
                target.setAttribute("aria-invalid", "true");
              }
            },
          });
        else
          control = h("input", {
            id: fieldId,
            type: type === "number" ? "number" : "text",
            value: value ?? "",
            placeholder,
            disabled: !can,
            onInput: (event: Event) => {
              const text = valueOf(event);
              update(text === "" ? undefined : type === "number" ? Number(text) : text);
            },
          });
        const label = h("label", { for: fieldId }, spec.label ?? prop);
        const check = custom === undefined && type === "boolean";
        return h("div", { class: check ? "cev-field cev-check" : "cev-field" }, [
          check ? control : label,
          check ? label : control,
          spec.description ? h("small", spec.description) : null,
        ]);
      }

      function rawField(key: string) {
        const fieldId = `${id}-raw-${key}`;
        return h("div", { class: "cev-field cev-raw" }, [
          h("label", { for: fieldId, class: "cev-code" }, key),
          h("input", {
            id: fieldId,
            value: shown(current[key]),
            disabled: !can,
            onInput: (event: Event) =>
              setProps((current) => ({ ...current, [key]: valueOf(event) })),
          }),
          can
            ? h(
                "button",
                {
                  type: "button",
                  class: "cev-remove",
                  "aria-label": `Remove ${key}`,
                  onClick: () =>
                    setProps((current) => writeProp(current, key.replace(/^:/, ""), undefined)),
                },
                "×",
              )
            : null,
        ]);
      }

      const add = can
        ? h(
            "form",
            {
              class: "cev-add",
              onSubmit: (event: Event) => {
                event.preventDefault();
                const key = adding.value.key.trim();
                if (!/^:?[\w-]+$/.test(key) || key.replace(/^:/, "") === "$") return;
                const value = adding.value.value;
                setProps((current) => {
                  const without = writeProp(current, key.replace(/^:/, ""), undefined) ?? {};
                  return { ...without, [key]: value };
                });
                adding.value = { key: "", value: "" };
              },
            },
            [
              h("input", {
                class: "cev-code",
                placeholder: "prop",
                "aria-label": "New prop's name",
                value: adding.value.key,
                onInput: (event: Event) => (adding.value.key = valueOf(event)),
              }),
              h("input", {
                placeholder: "value",
                "aria-label": "New prop's value",
                value: adding.value.value,
                onInput: (event: Event) => (adding.value.value = valueOf(event)),
              }),
              h("button", { type: "submit" }, "Add"),
            ],
          )
        : null;

      const tag = `${inline ? ":" : "::"}${name}`;
      const title = html ? `<${name}>` : (info?.label ?? name);
      const content = h(
        "div",
        {
          ref: panel,
          id,
          class: "cev-panel",
          popover: "auto",
          [CHROME]: "",
          contenteditable: "false",
          onToggle: toggle,
        },
        [
          h("p", { class: "cev-panel-title" }, [
            title,
            info?.label ? h("span", { class: "cev-code" }, tag) : null,
          ]),
          ...typed.map(typedField),
          ...rest.map(rawField),
          typed.length || rest.length || can ? null : h("p", { class: "cev-empty" }, "No props."),
          add,
        ],
      );
      const summary = [
        ...typed.flatMap((prop) => {
          const value = readProp(current, prop, schema[prop]!.type ?? "string");
          return value === undefined ? [] : [`${prop}=${shown(value)}`];
        }),
        ...rest.map((key) => `${key}=${shown(current[key])}`),
      ].join(" ");

      if (inline)
        return h(
          NodeViewWrapper,
          { as: "span", class: "cev-inline", "data-comark-inline": name },
          () => [
            h(NodeViewContent, { as: "span", class: "cev-text" }),
            h(
              "button",
              {
                ref: button,
                type: "button",
                class: "cev-tag",
                popovertarget: id,
                title: summary || undefined,
                contenteditable: "false",
                [CHROME]: "",
              },
              [icon(info), h("span", { class: "cev-visually-hidden" }, "Props of "), tag],
            ),
            content,
          ],
        );

      return h(
        NodeViewWrapper,
        { as: "div", class: "cev-block", "data-comark-block": name },
        () => [
          h("div", { class: "cev-bar", contenteditable: "false", [CHROME]: "" }, [
            icon(info),
            h("span", { class: "cev-name" }, title),
            info?.label ? h("span", { class: "cev-code cev-tag-name" }, tag) : null,
            html
              ? null
              : h(
                  "button",
                  { ref: button, type: "button", class: "cev-props", popovertarget: id },
                  [
                    h("span", { class: "cev-visually-hidden" }, `Props of ${title}: `),
                    summary || (can ? "Add props" : "No props"),
                  ],
                ),
            html ? null : content,
          ]),
          h(NodeViewContent, { as: "div", class: "cev-body" }),
        ],
      );
    };
  },
});

/**
 * The node view `ComarkKit`'s `componentView` option takes: a block component shows its name and props above its
 * editable content and slots, and an inline one a tag after its text. Each opens a panel that edits the props through
 * a transaction on the node's `props` attribute, so the schema and the Markdown the codec writes stay as they are.
 */
export function componentView(options: ComponentViewOptions = {}): NodeViewRenderer {
  const component = defineComponent({
    props: nodeViewProps,
    setup: (props) => () => h(ComponentView, { ...props, options }),
  });
  return VueNodeViewRenderer(component, { stopEvent });
}

/** The view's styles, which it adds to the page with the first component. */
export const componentViewCss = `@layer comark{${[
  theme(".cev-block,.cev-inline,.cev-panel", "shadow", "status"),
  `.cev-block{margin:.75rem 0;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius)}`,
  `.cev-bar{display:flex;align-items:center;gap:.5rem;min-height:2rem;padding:0 .5rem 0 .75rem;border-bottom:1px solid var(--_comark-border);color:var(--_comark-muted);font:500 .75rem/1.4 var(--_comark-font);user-select:none}`,
  `.cev-name{color:var(--_comark-foreground)}`,
  `.cev-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.6875rem}`,
  `.cev-icon{display:inline-block;width:1em;height:1em;flex:none}`,
  `.cev-props{min-width:0;overflow:hidden;padding:.125rem .375rem;border:0;border-radius:calc(var(--_comark-radius)*.75);background:none;color:inherit;font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.6875rem;text-align:start;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}`,
  `.cev-props:hover,.cev-tag:hover{background:var(--_comark-accent);color:var(--_comark-foreground)}`,
  `.cev-props:focus-visible,.cev-tag:focus-visible,.cev-panel :focus-visible{outline:2px solid var(--_comark-ring);outline-offset:1px}`,
  `.cev-body{padding:.25rem .75rem}`,
  `.cev-block [data-comark-slot]{margin:.5rem -.75rem 0;padding:0 .75rem;border-top:1px dashed var(--_comark-border)}`,
  `.cev-block [data-comark-slot]::before{content:"#" attr(data-comark-slot);display:block;padding-top:.25rem;color:var(--_comark-muted);font:500 .6875rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;user-select:none}`,
  `.cev-inline{padding:0 .125rem 0 .25rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius)*.75);background:var(--_comark-accent)}`,
  `.cev-tag{display:inline-flex;align-items:center;gap:.25rem;margin-inline-start:.25rem;padding:0 .25rem;border:0;border-radius:calc(var(--_comark-radius)*.5);background:none;color:var(--_comark-muted);font:500 max(.75em,.6875rem)/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;vertical-align:baseline;cursor:pointer;user-select:none}`,
  `.cev-panel{position:fixed;inset:auto;margin:0;width:18rem;max-height:min(24rem,80vh);overflow:auto;padding:.75rem;border:1px solid var(--_comark-border);border-radius:var(--_comark-radius);background:var(--_comark-background);color:var(--_comark-foreground);box-shadow:var(--_comark-shadow);font:400 .8125rem/1.4 var(--_comark-font);white-space:normal}`,
  `.cev-panel:popover-open{display:grid;gap:.625rem}`,
  `.cev-panel-title{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;margin:0;font-weight:600}`,
  `.cev-panel-title .cev-code,.cev-tag-name{color:var(--_comark-muted);font-weight:500}`,
  `.cev-field{display:grid;gap:.25rem}`,
  `.cev-field>label{color:var(--_comark-muted);font-size:.75rem}`,
  `.cev-field>small{color:var(--_comark-muted);font-size:.6875rem}`,
  `.cev-check{grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:.5rem}`,
  `.cev-check>small{grid-column:1/-1}`,
  `.cev-raw{grid-template-columns:minmax(0,1fr) auto}`,
  `.cev-raw>label{grid-column:1/-1}`,
  `.cev-panel input:not([type=checkbox]),.cev-panel select,.cev-panel textarea{width:100%;min-width:0;padding:.25rem .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius)*.75);background:var(--_comark-background);color:inherit;font:inherit}`,
  `.cev-panel input[type=checkbox]{justify-self:start;accent-color:var(--_comark-foreground)}`,
  `.cev-panel textarea{resize:vertical}`,
  `.cev-panel [aria-invalid=true]{border-color:var(--_comark-danger)}`,
  `.cev-panel button{padding:.25rem .5rem;border:1px solid var(--_comark-border);border-radius:calc(var(--_comark-radius)*.75);background:var(--_comark-accent);color:inherit;font:inherit;cursor:pointer}`,
  `.cev-add{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:.25rem;padding-top:.625rem;border-top:1px solid var(--_comark-border)}`,
  `.cev-empty{margin:0;color:var(--_comark-muted)}`,
  `.cev-visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
].join("")}}`;
