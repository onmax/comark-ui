import type { MarkdownProps } from "@comark/svelte";
import type { Component, Snippet } from "svelte";
import type { Block, MessagePart, Step } from "comark-chat";

export { read, valueText } from "comark-chat";
export type { Block, MessagePart, Step, StepStatus, ToolValue } from "comark-chat";

type Of<Union, Kind> = Extract<Union, { kind: Kind }>;

type MarkdownOptions = Pick<MarkdownProps, "plugins" | "components" | "options">;

export declare const MessageMarkdown: Component<
  MarkdownOptions & { value?: string; streaming?: boolean }
>;

export declare const MessageParts: Component<
  MarkdownOptions & {
    parts: readonly MessagePart[];
    streaming?: boolean;
    markdown?: Snippet<[{ value: string; streaming: boolean }]>;
    text?: Snippet<[Of<Block, "text">]>;
    reasoning?: Snippet<[Of<Step, "reasoning">]>;
    tool?: Snippet<[Of<Step, "tool">]>;
    source?: Snippet<[Of<Step, "source">]>;
    file?: Snippet<[Of<Block, "file">]>;
    step?: Snippet<[Of<Block, "step-start">]>;
    fallback?: Snippet<[Of<Block, "other">]>;
  }
>;
