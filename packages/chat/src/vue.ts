import { Markdown, type MarkdownProps } from "@comark/vue";
import {
  Comment,
  defineComponent,
  Fragment,
  getCurrentInstance,
  h,
  isVNode,
  onMounted,
  Suspense,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeChild,
} from "vue";
import { addStyles } from "./client.ts";
import { read, type Block, type MessagePart, type Step } from "./index.ts";

export { read, valueText } from "./index.ts";
export type { Block, MessagePart, Step, StepStatus, ToolValue } from "./index.ts";

type Of<Union, Kind> = Extract<Union, { kind: Kind }>;

// What Vue's own slot fallback checks: a slot whose content is only comments, such as a false `v-if`, renders nothing.
const renders = (nodes: unknown): boolean =>
  Array.isArray(nodes) &&
  nodes.some(
    (node) =>
      !isVNode(node) ||
      (node.type !== Comment && (node.type !== Fragment || renders(node.children))),
  );
// A slot that renders nothing keeps the default, so a slot can replace some parts of a kind and leave the rest.
const or = (custom: VNode[] | undefined, fallback: () => VNodeChild): VNodeChild =>
  renders(custom) ? custom : fallback();

const markdownProps = {
  // SAFETY: Vue checks only that this is an array; `@comark/vue` reads each plugin.
  /** Comark plugins for the Markdown of text and reasoning parts, such as `comark-ui`'s. */
  plugins: { type: Array as PropType<MarkdownProps["plugins"]> },
  // SAFETY: Vue checks only that this is an object; `@comark/vue` renders each component.
  /** Comark components for that Markdown. */
  components: { type: Object as PropType<MarkdownProps["components"]> },
  // SAFETY: Vue checks only that this is an object; `@comark/vue` passes it to the parser.
  /** Comark parser options for that Markdown. */
  options: { type: Object as PropType<MarkdownProps["options"]> },
};

/** A text or reasoning part's Markdown, rendered by `@comark/vue`. Its own Suspense shows the plain text until it parses. */
export const MessageMarkdown = defineComponent({
  name: "MessageMarkdown",
  props: {
    ...markdownProps,
    value: { type: String, default: "" },
    streaming: { type: Boolean, default: false },
  },
  setup(props) {
    const instance = getCurrentInstance();
    const suspended = Boolean(instance && "suspense" in instance && instance.suspense);
    return () => {
      const markdown = () =>
        h(Markdown, {
          value: props.value,
          streaming: props.streaming,
          caret: props.streaming,
          plugins: props.plugins,
          components: props.components,
          options: props.options,
        });
      const body = suspended
        ? markdown()
        : h(Suspense, null, { default: markdown, fallback: () => h("p", props.value) });
      return h("div", { class: "cht-text" }, body);
    };
  },
});

/**
 * An AI SDK message's parts: text as Markdown, files, and the turn's reasoning, tool calls, and sources as one trace.
 * Every slot gets what `read()` made of its part, with `index` and `part`; `part` replaces any part, and the others
 * replace their kind. A slot that renders nothing for a part keeps the default.
 */
export const MessageParts = defineComponent({
  name: "MessageParts",
  props: {
    ...markdownProps,
    // SAFETY: Vue checks only that this is an array; `read()` checks each part before it reads it.
    parts: { type: Array as PropType<readonly MessagePart[]>, required: true },
    /** The message is still arriving: the last reasoning reads "Thinking" and text shows a caret. */
    streaming: { type: Boolean, default: false },
  },
  // SAFETY: slot types exist only for TypeScript; Vue passes each slot the props written below.
  slots: Object as SlotsType<{
    /** Replaces the Markdown of every text and reasoning part, for an app with its own Markdown component. */
    markdown: { value: string; streaming: boolean };
    part: { index: number; part: MessagePart };
    text: Of<Block, "text">;
    reasoning: Of<Step, "reasoning">;
    tool: Of<Step, "tool">;
    source: Of<Step, "source">;
    file: Of<Block, "file">;
    step: Of<Block, "step-start">;
    fallback: Of<Block, "other">;
  }>,
  setup(props, { slots }) {
    onMounted(addStyles);
    const markdown = (value: string, streaming: boolean) =>
      or(slots.markdown?.({ value, streaming }), () =>
        h(MessageMarkdown, {
          value,
          streaming,
          plugins: props.plugins,
          components: props.components,
          options: props.options,
        }),
      );

    const line = (step: Step, tag = "div", attrs: Record<string, unknown> = {}) =>
      h(tag, { class: "cht-line", ...attrs }, [
        h("span", { class: "cht-dot", "aria-hidden": "true" }),
        h("span", { class: "cht-title" }, step.title),
        step.kind === "tool" && step.state ? h("span", { class: "cht-state" }, step.state) : null,
      ]);

    function stepBody(step: Step): VNodeChild {
      if (step.kind === "source")
        return or(slots.source?.(step), () =>
          step.href
            ? line(step, "a", { href: step.href, rel: "noreferrer", target: "_blank" })
            : line(step),
        );
      if (step.kind === "reasoning")
        return or(slots.reasoning?.(step), () =>
          step.text
            ? h("details", [
                line(step, "summary"),
                h("div", { class: "cht-detail" }, [markdown(step.text, step.status === "running")]),
              ])
            : line(step),
        );
      return or(slots.tool?.(step), () => tool(step));
    }

    function tool(step: Of<Step, "tool">): VNodeChild {
      if (!step.values.length) return line(step);
      return h("details", [
        line(step, "summary"),
        h(
          "div",
          { class: "cht-detail" },
          step.values.map((value) =>
            h("div", { class: "cht-value", "data-label": value.label }, [
              h("div", { class: "cht-value-label" }, value.label),
              h("pre", h("code", value.text)),
            ]),
          ),
        ),
      ]);
    }

    function file(block: Of<Block, "file">): VNodeChild {
      if (block.image)
        return h("img", { class: "cht-image", alt: block.name, src: block.image, loading: "lazy" });
      const content = [
        h("span", { class: "cht-file-name" }, block.name),
        block.mediaType && block.mediaType !== block.name
          ? h("span", { class: "cht-file-type" }, block.mediaType)
          : null,
      ];
      if (!block.href) return h("span", { class: "cht-file" }, content);
      const external = !block.href.startsWith("data:");
      return h(
        "a",
        {
          class: "cht-file",
          href: block.href,
          download: block.download,
          rel: external ? "noreferrer" : undefined,
          target: external ? "_blank" : undefined,
        },
        content,
      );
    }

    return () => {
      const children: VNodeChild[] = [];
      for (const block of read(props.parts, props.streaming)) {
        if (block.kind === "trace") {
          // A part the `part` slot replaces leaves the list, so the trace around it splits in two.
          let steps: VNodeChild[] = [];
          const flush = () => {
            if (steps.length)
              children.push(
                h("ul", { key: `trace-${children.length}`, class: "cht-trace" }, steps),
              );
            steps = [];
          };
          for (const step of block.steps) {
            const custom = slots.part?.({ index: step.index, part: step.part });
            if (renders(custom)) {
              flush();
              children.push(custom);
              continue;
            }
            steps.push(
              h(
                "li",
                {
                  key: step.kind === "tool" ? step.id : step.index,
                  class: "cht-step",
                  "data-kind": step.kind,
                  "data-status": step.kind === "source" ? undefined : step.status,
                },
                [stepBody(step)],
              ),
            );
          }
          flush();
          continue;
        }
        const custom = slots.part?.({ index: block.index, part: block.part });
        if (renders(custom)) children.push(custom);
        else if (block.kind === "text")
          children.push(or(slots.text?.(block), () => markdown(block.text, block.streaming)));
        else if (block.kind === "file") children.push(or(slots.file?.(block), () => file(block)));
        else if (block.kind === "step-start") children.push(slots.step?.(block) ?? null);
        else children.push(slots.fallback?.(block) ?? null);
      }
      return h(
        "div",
        { class: "cht", "data-streaming": props.streaming ? "" : undefined },
        children,
      );
    };
  },
});
