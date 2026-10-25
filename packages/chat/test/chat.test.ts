import type { UIMessage } from "ai";
import { describe, expect, it } from "vite-plus/test";
import { read } from "../src/index.ts";

// Typed as the AI SDK's own message, so a change to its parts that this package can't read fails the typecheck.
const message: UIMessage = {
  id: "m1",
  role: "assistant",
  parts: [
    { type: "step-start" },
    { type: "reasoning", text: "Look at the failing test first.", state: "done" },
    {
      type: "tool-run_focused_tests",
      toolCallId: "call-1",
      state: "output-error",
      input: { file: "a.test.ts" },
      errorText: "1 test failed",
    },
    { type: "source-url", sourceId: "s1", url: "https://vitest.dev", title: "Vitest" },
    { type: "text", text: "The test **fails** on line 3.", state: "done" },
    {
      type: "file",
      mediaType: "image/png",
      url: "https://example.com/shot.png",
      filename: "shot.png",
    },
    { type: "data-progress", data: { done: 1 } },
  ],
};

describe("read()", () => {
  it("reads an AI SDK message into text, files, and one trace per run of steps", () => {
    const blocks = read(message.parts);
    expect(blocks.map((block) => block.kind)).toEqual([
      "step-start",
      "trace",
      "text",
      "file",
      "other",
    ]);
    const trace = blocks[1];
    expect(trace?.kind === "trace" && trace.steps).toMatchObject([
      { kind: "reasoning", title: "Thought", status: "done" },
      {
        kind: "tool",
        id: "call-1",
        title: "run focused tests",
        status: "error",
        state: "Failed",
        values: [
          { label: "Input", text: '{\n  "file": "a.test.ts"\n}' },
          { label: "Error", text: "1 test failed" },
        ],
      },
      { kind: "source", title: "Vitest", href: "https://vitest.dev" },
    ]);
    expect(blocks[3]).toMatchObject({
      kind: "file",
      name: "shot.png",
      image: "https://example.com/shot.png",
    });
  });

  it("uses message streaming for legacy parts without a state", () => {
    const blocks = read(
      [
        { type: "reasoning", text: "Hmm" },
        { type: "text", text: "Hel" },
      ],
      true,
    );
    expect(blocks[0]).toMatchObject({ steps: [{ title: "Thinking", status: "running" }] });
    expect(blocks[1]).toMatchObject({ kind: "text", streaming: true });
  });

  it.each([false, true])(
    "respects explicit part states when message streaming is %s",
    (streaming) => {
      const parts: UIMessage["parts"] = [
        { type: "reasoning", text: "Finished thought", state: "done" },
        { type: "text", text: "Finished answer", state: "done" },
        { type: "reasoning", text: "Next thought", state: "streaming" },
        { type: "text", text: "Next answer", state: "streaming" },
      ];
      expect(read(parts, streaming)).toMatchObject([
        { steps: [{ title: "Thought", status: "done" }] },
        { kind: "text", streaming: false },
        { steps: [{ title: "Thinking", status: "running" }] },
        { kind: "text", streaming: true },
      ]);
    },
  );

  it("renders reasoning files with the same URL safety as files and preserves the part", () => {
    const parts: UIMessage["parts"] = [
      { type: "reasoning-file", mediaType: "image/png", url: "https://example.com/thought.png" },
      {
        type: "reasoning-file",
        mediaType: "application/pdf",
        url: "https://example.com/thought.pdf",
      },
      { type: "reasoning-file", mediaType: "image/png", url: "data:image/png;base64,YQ==" },
      { type: "reasoning-file", mediaType: "image/png", url: "javascript:alert(1)" },
      { type: "reasoning-file", mediaType: "text/plain", url: "data:text/plain,hi" },
    ];
    const blocks = read(parts);
    expect(blocks).toMatchObject([
      { kind: "file", image: "https://example.com/thought.png" },
      { kind: "file", href: "https://example.com/thought.pdf" },
      { kind: "file", image: "data:image/png;base64,YQ==", href: undefined },
      { kind: "file", href: undefined },
      { kind: "file", href: undefined },
    ]);
    for (const [index, part] of parts.entries()) {
      expect(blocks[index]).toHaveProperty("part", part);
      expect(blocks[index]).toEqual({ ...read([{ ...part, type: "file" }])[0], index, part });
    }
  });

  it("names each tool state", () => {
    const states = ["input-streaming", "approval-requested", "output-available", "output-denied"];
    const steps = states.map((state, index) => {
      const [trace] = read([
        { type: "dynamic-tool", toolName: "deploy", toolCallId: String(index), state },
      ]);
      return trace?.kind === "trace" ? trace.steps[0] : undefined;
    });
    expect(
      steps.map((step) => step?.kind === "tool" && [step.title, step.status, step.state]),
    ).toEqual([
      ["deploy", "running", "Running"],
      ["deploy", "waiting", "Needs approval"],
      ["deploy", "done", ""],
      ["deploy", "error", "Denied"],
    ]);
  });

  it("never throws on values it can't show, and never links unsafe URLs", () => {
    const cyclic: Record<string, unknown> = { big: 1n };
    cyclic.self = cyclic;
    const throwing = {
      toJSON() {
        throw new Error("nope");
      },
    };
    const blocks = read([
      {
        type: "tool-a",
        toolCallId: "1",
        state: "output-available",
        input: cyclic,
        output: throwing,
      },
      { type: "source-url", sourceId: "s", url: "javascript:alert(1)" },
      { type: "file", mediaType: "image/svg+xml", url: "javascript:alert(1)" },
      { type: "file", mediaType: "text/plain", url: "data:text/plain,hi" },
      { type: "file", mediaType: "text/plain", url: "data:text/plain,hi", filename: "hi.txt" },
      // SAFETY: a stored message can hold anything; read() must survive it.
      null as unknown as { type: string },
    ]);
    const [trace, image, unnamed, named] = blocks;
    expect(trace?.kind === "trace" && trace.steps).toMatchObject([
      {
        values: [
          { text: '{\n  "big": "1n",\n  "self": "[Circular]"\n}' },
          { text: "[Value cannot be shown]" },
        ],
      },
      { kind: "source", href: undefined },
    ]);
    expect(image).toMatchObject({ kind: "file", href: undefined });
    expect(image).not.toHaveProperty("image");
    expect(unnamed).toMatchObject({ href: undefined });
    expect(named).toMatchObject({ href: "data:text/plain,hi", download: "hi.txt" });
    expect(blocks).toHaveLength(4);
  });
});
