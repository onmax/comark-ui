import { MarkdownClient, type MarkdownProps } from "@comark/react";
import { createElement as h, Fragment, type ReactNode, useEffect } from "react";
import { addStyles } from "./client.ts";
import { read, type Block, type MessagePart, type Step } from "./index.ts";

export { read, valueText } from "./index.ts";
export type { Block, MessagePart, Step, StepStatus, ToolValue } from "./index.ts";

type Of<Union, Kind> = Extract<Union, { kind: Kind }>;

type MarkdownOptions = Pick<MarkdownProps, "plugins" | "components" | "options">;

/** Replace how a kind of part renders. `part` replaces any part; return `undefined` to keep the default. */
export type MessagePartsRender = {
  /** Replaces the Markdown of every text and reasoning part, for an app with its own Markdown component. */
  markdown?: (props: { value: string; streaming: boolean }) => ReactNode;
  part?: (props: { index: number; part: MessagePart }) => ReactNode;
  text?: (block: Of<Block, "text">) => ReactNode;
  reasoning?: (step: Of<Step, "reasoning">) => ReactNode;
  tool?: (step: Of<Step, "tool">) => ReactNode;
  source?: (step: Of<Step, "source">) => ReactNode;
  file?: (block: Of<Block, "file">) => ReactNode;
  step?: (block: Of<Block, "step-start">) => ReactNode;
  fallback?: (block: Of<Block, "other">) => ReactNode;
};

export type MessagePartsProps = MarkdownOptions & {
  parts: readonly MessagePart[];
  /** The message is still arriving: the last reasoning reads "Thinking" and text shows a caret. */
  streaming?: boolean;
  render?: MessagePartsRender;
};

/** A text or reasoning part's Markdown, rendered on the client by `@comark/react`, so it updates as it streams. */
export function MessageMarkdown({
  value,
  streaming = false,
  ...markdown
}: MarkdownOptions & { value: string; streaming?: boolean }) {
  return h(
    "div",
    { className: "cht-text" },
    h(MarkdownClient, { ...markdown, value, streaming, caret: streaming }),
  );
}

// Only `undefined` keeps the default, so a render function can return `null` to hide a part.
const or = (custom: ReactNode | undefined, fallback: () => ReactNode) =>
  custom === undefined ? fallback() : custom;

function line(step: Step, tag = "div", attrs: Record<string, unknown> = {}) {
  return h(
    tag,
    { className: "cht-line", ...attrs },
    h("span", { className: "cht-dot", "aria-hidden": "true" }),
    h("span", { className: "cht-title" }, step.title),
    step.kind === "tool" && step.state ? h("span", { className: "cht-state" }, step.state) : null,
  );
}

function file(block: Of<Block, "file">) {
  if (block.image)
    return h("img", { className: "cht-image", alt: block.name, src: block.image, loading: "lazy" });
  const content = [
    h("span", { key: "name", className: "cht-file-name" }, block.name),
    block.mediaType && block.mediaType !== block.name
      ? h("span", { key: "type", className: "cht-file-type" }, block.mediaType)
      : null,
  ];
  if (!block.href) return h("span", { className: "cht-file" }, content);
  const external = !block.href.startsWith("data:");
  return h(
    "a",
    {
      className: "cht-file",
      href: block.href,
      download: block.download,
      rel: external ? "noreferrer" : undefined,
      target: external ? "_blank" : undefined,
    },
    content,
  );
}

/**
 * An AI SDK message's parts: text as Markdown, files, and the turn's reasoning, tool calls, and sources as one trace.
 * Each function in `render` gets what `read()` made of its part, with `index` and `part`.
 */
export function MessageParts({
  parts,
  streaming = false,
  render = {},
  ...options
}: MessagePartsProps) {
  useEffect(addStyles, []);
  const markdown = (value: string, live: boolean) =>
    or(render.markdown?.({ value, streaming: live }), () =>
      h(MessageMarkdown, { ...options, value, streaming: live }),
    );

  function stepBody(step: Step): ReactNode {
    if (step.kind === "source")
      return or(render.source?.(step), () =>
        step.href
          ? line(step, "a", { href: step.href, rel: "noreferrer", target: "_blank" })
          : line(step),
      );
    if (step.kind === "reasoning") {
      const custom = render.reasoning?.(step);
      if (custom !== undefined) return custom;
      if (!step.text) return line(step);
      return h(
        "details",
        null,
        line(step, "summary"),
        h("div", { className: "cht-detail" }, markdown(step.text, step.status === "running")),
      );
    }
    const custom = render.tool?.(step);
    if (custom !== undefined) return custom;
    if (!step.values.length) return line(step);
    return h(
      "details",
      null,
      line(step, "summary"),
      h(
        "div",
        { className: "cht-detail" },
        step.values.map((value) =>
          h(
            "div",
            { key: value.label, className: "cht-value", "data-label": value.label },
            h("div", { className: "cht-value-label" }, value.label),
            h("pre", null, h("code", null, value.text)),
          ),
        ),
      ),
    );
  }

  const children: ReactNode[] = [];
  const keyed = (key: string, node: ReactNode) => h(Fragment, { key }, node);
  for (const block of read(parts, streaming)) {
    if (block.kind === "trace") {
      // A part that `render.part` replaces leaves the list, so the trace around it splits in two.
      let steps: ReactNode[] = [];
      const flush = () => {
        if (steps.length)
          children.push(
            h("ul", { key: `trace-${children.length}`, className: "cht-trace" }, steps),
          );
        steps = [];
      };
      for (const step of block.steps) {
        const custom = render.part?.({ index: step.index, part: step.part });
        if (custom !== undefined) {
          flush();
          children.push(keyed(`part-${step.index}`, custom));
          continue;
        }
        steps.push(
          h(
            "li",
            {
              key: step.kind === "tool" ? step.id : step.index,
              className: "cht-step",
              "data-kind": step.kind,
              "data-status": step.kind === "source" ? undefined : step.status,
            },
            stepBody(step),
          ),
        );
      }
      flush();
      continue;
    }
    const custom = render.part?.({ index: block.index, part: block.part });
    let node: ReactNode;
    if (custom !== undefined) node = custom;
    else if (block.kind === "text")
      node = or(render.text?.(block), () => markdown(block.text, block.streaming));
    else if (block.kind === "file") node = or(render.file?.(block), () => file(block));
    else if (block.kind === "step-start") node = or(render.step?.(block), () => null);
    else node = or(render.fallback?.(block), () => null);
    children.push(keyed(`part-${block.index}`, node));
  }
  return h("div", { className: "cht", "data-streaming": streaming ? "" : undefined }, children);
}
