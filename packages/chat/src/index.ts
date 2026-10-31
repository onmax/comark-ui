import { isWebUrl } from "../../../shared/url.ts";

/**
 * The parts of a message, shaped like the AI SDK's `UIMessage["parts"]`, so its messages pass as they are. Every field
 * is read defensively: parts come from the model and from tools, and a stored message can be older or newer than this
 * package.
 */
export type MessagePart = { type: string };

/** How far a tool call or a thought has got. `waiting` is a call that needs the user's approval. */
export type StepStatus = "running" | "waiting" | "error" | "done";

/** One labelled value of a tool call, as text: its input, its output, or its error. */
export type ToolValue = { label: "Input" | "Output" | "Error"; text: string };

/** What the steps of a turn show, one per reasoning, tool, or source part. */
export type Step<Part extends MessagePart = MessagePart> =
  | {
      kind: "reasoning";
      index: number;
      part: Part;
      text: string;
      status: StepStatus;
      title: string;
    }
  | {
      kind: "tool";
      index: number;
      part: Part;
      id: string;
      title: string;
      status: StepStatus;
      /** The status in words, such as "Failed", or empty when the call is done. */
      state: string;
      values: ToolValue[];
    }
  | { kind: "source"; index: number; part: Part; title: string; href?: string };

/** What a message shows, in order. Consecutive steps share one `trace`, so the steps of a turn read as one list. */
export type Block<Part extends MessagePart = MessagePart> =
  | { kind: "text"; index: number; part: Part; text: string; streaming: boolean }
  | { kind: "trace"; index: number; steps: Step<Part>[] }
  | {
      kind: "file";
      index: number;
      part: Part;
      name: string;
      mediaType: string;
      /** A URL the browser may open: http, https, or for a named file a data URL. Missing when it's neither. */
      href?: string;
      /** The name to save the file as, when it has one and a link. */
      download?: string;
      /** Set when the file is an image the page may load. */
      image?: string;
    }
  | { kind: "step-start"; index: number; part: Part }
  | { kind: "other"; index: number; part: Part };

type Fields = Record<string, unknown>;

// SAFETY: every part is an object with a `type`; the other fields are read through `string()` and `in`.
const fields = (part: MessagePart) => part as MessagePart & Fields;
const string = (value: unknown) => (typeof value === "string" ? value : undefined);

const isImageUrl = (value: string) =>
  isWebUrl(value) || value.startsWith("blob:") || /^data:image\/[a-z0-9.+-]+[;,]/i.test(value);

/** A tool's value as text. Values come from the model and from tools, so they can be cyclic or throw when read. */
export function valueText(value: unknown): string {
  if (typeof value === "string") return value;
  const ancestors: unknown[] = [];
  try {
    return (
      JSON.stringify(
        value,
        function (this: unknown, _key, item: unknown) {
          if (typeof item === "bigint") return `${item}n`;
          if (item === null || typeof item !== "object") return item;
          while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop();
          if (ancestors.includes(item)) return "[Circular]";
          ancestors.push(item);
          return item;
        },
        2,
      ) ?? String(value)
    );
  } catch {
    return "[Value cannot be shown]";
  }
}

const isTool = (part: MessagePart) => part.type === "dynamic-tool" || part.type.startsWith("tool-");

const toolStates = new Map<string, [StepStatus, string]>([
  ["input-streaming", ["running", "Running"]],
  ["input-available", ["running", "Running"]],
  ["approval-requested", ["waiting", "Needs approval"]],
  ["approval-responded", ["running", "Running"]],
  ["output-error", ["error", "Failed"]],
  ["output-denied", ["error", "Denied"]],
]);

function toolStep<Part extends MessagePart>(part: Part, index: number): Step<Part> {
  const data = fields(part);
  // Tool titles are often phrases already, such as "Run focused tests", so the state goes beside the title, not in it.
  const title =
    part.type === "dynamic-tool"
      ? (string(data.title) ?? string(data.toolName) ?? "Tool")
      : part.type.slice("tool-".length).replaceAll(/[-_]/g, " ");
  const [status, state] = toolStates.get(string(data.state) ?? "") ?? ["done", ""];
  const values: ToolValue[] = [];
  if ("input" in data && data.input !== undefined)
    values.push({ label: "Input", text: valueText(data.input) });
  if ("output" in data && data.output !== undefined)
    values.push({ label: "Output", text: valueText(data.output) });
  const error = string(data.errorText);
  if (error) values.push({ label: "Error", text: error });
  return {
    kind: "tool",
    index,
    part,
    id: string(data.toolCallId) ?? String(index),
    title,
    status,
    state,
    values,
  };
}

function step<Part extends MessagePart>(
  part: Part,
  index: number,
  streaming: boolean,
): Step<Part> | undefined {
  const data = fields(part);
  if (isTool(part)) return toolStep(part, index);
  if (part.type === "reasoning") {
    const running = data.state === "streaming" || (data.state == null && streaming);
    const text = string(data.text) ?? "";
    return {
      kind: "reasoning",
      index,
      part,
      text,
      status: running ? "running" : "done",
      title: running ? "Thinking" : "Thought",
    };
  }
  if (part.type === "source-url") {
    const url = string(data.url) ?? "";
    return {
      kind: "source",
      index,
      part,
      title: string(data.title) ?? url,
      href: isWebUrl(url) ? url : undefined,
    };
  }
  if (part.type === "source-document")
    return { kind: "source", index, part, title: string(data.title) ?? "Source" };
  return undefined;
}

function file<Part extends MessagePart>(part: Part, index: number): Block<Part> {
  const data = fields(part);
  const url = string(data.url) ?? "";
  const mediaType = string(data.mediaType) ?? "";
  const filename = string(data.filename);
  const name = filename ?? (mediaType || "File");
  if ((mediaType === "image" || mediaType.startsWith("image/")) && isImageUrl(url))
    return {
      kind: "file",
      index,
      part,
      name,
      mediaType,
      href: isWebUrl(url) ? url : undefined,
      image: url,
    };
  // A data URL without a name would download as "download", so only a named one is offered.
  const href = isWebUrl(url) || (filename && /^data:[^,]*,/i.test(url)) ? url : undefined;
  return {
    kind: "file",
    index,
    part,
    name,
    mediaType,
    href,
    download: href ? filename : undefined,
  };
}

/**
 * Reads a message's parts into what it shows: text, files, and traces of the turn's reasoning, tool calls, and sources.
 * Every renderer goes through it, so they can't disagree. `streaming` marks parts without an explicit state as still arriving. It
 * never throws, whatever the parts hold.
 */
export function read<Part extends MessagePart>(
  parts: readonly Part[],
  streaming = false,
): Block<Part>[] {
  const blocks: Block<Part>[] = [];
  let trace: Step<Part>[] | undefined;
  parts.forEach((part, index) => {
    if (!part || typeof part.type !== "string") return;
    const found = step(part, index, streaming);
    if (found) {
      if (!trace) {
        trace = [];
        blocks.push({ kind: "trace", index, steps: trace });
      }
      trace.push(found);
      return;
    }
    trace = undefined;
    const data = fields(part);
    if (part.type === "text")
      blocks.push({
        kind: "text",
        index,
        part,
        text: string(data.text) ?? "",
        streaming: data.state === "streaming" || (data.state == null && streaming),
      });
    else if (part.type === "file" || part.type === "reasoning-file") blocks.push(file(part, index));
    else if (part.type === "step-start") blocks.push({ kind: "step-start", index, part });
    else blocks.push({ kind: "other", index, part });
  });
  return blocks;
}
