import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { EditorState, type Transaction } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  ComarkKit,
  findUpload,
  fromMarkdown,
  startUploads,
  toMarkdown,
  uploadKey,
  uploadPlugin,
  type UploadOptions,
} from "../src/editor.ts";

const schema = getSchema([ComarkKit]);

async function editorOf(markdown: string, options: UploadOptions) {
  const { doc } = await fromMarkdown(markdown);
  const view = {
    state: EditorState.create({
      doc: Node.fromJSON(schema, doc),
      plugins: [uploadPlugin(options)],
    }),
    dispatch(tr: Transaction) {
      view.state = view.state.apply(tr);
    },
  };
  return view;
}

function deferred() {
  let resolve!: (src: string) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<string>((yes, no) => ((resolve = yes), (reject = no)));
  return { promise, resolve, reject };
}

const media = (file: File) => /^(?:image|video|audio)\//.test(file.type);
const png = new File([new Uint8Array([1])], "shot.png", { type: "image/png" });
const mp4 = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" });

describe("uploads", () => {
  it("shows a placeholder that follows edits, then writes the image where it sits", async () => {
    const sent = deferred();
    const progress: Array<(fraction: number) => void> = [];
    const options: UploadOptions = {
      accept: media,
      upload: (_file, report) => (progress.push(report), sent.promise),
    };
    const view = await editorOf("Before after\n", options);
    const [done] = startUploads(view, [png], 8, options);
    expect(uploadKey.getState(view.state)?.find()).toHaveLength(1);
    // The placeholder is a decoration, so a save or a collaborative room never sees a file that hasn't arrived.
    expect(await toMarkdown(view.state.doc.toJSON())).toBe("Before after\n");
    progress[0]!(0.4);

    const [placeholder] = uploadKey.getState(view.state)!.find();
    view.dispatch(view.state.tr.insertText("Very ", 1));
    expect(findUpload(view.state, placeholder!.spec.id as number)).toBe(13);
    sent.resolve("https://drop.dev/f/shot.png");
    await done;
    expect(uploadKey.getState(view.state)?.find()).toHaveLength(0);
    expect(await toMarkdown(view.state.doc.toJSON())).toBe(
      "Very Before ![shot.png](https://drop.dev/f/shot.png)after\n",
    );
  });

  it("writes a video as an image comark-media plays", async () => {
    const view = await editorOf("Watch\n", { accept: media });
    const [done] = startUploads(view, [mp4], 6, {
      accept: media,
      upload: async () => "/f/demo.mp4",
    });
    await done;
    expect(await toMarkdown(view.state.doc.toJSON())).toBe("Watch![demo.mp4](/f/demo.mp4)\n");
  });

  it("puts a file dropped between blocks in a paragraph of its own", async () => {
    const view = await editorOf("# Title\n\nText\n", { accept: media });
    const [done] = startUploads(view, [png], 7, {
      accept: media,
      upload: async () => "/f/shot.png",
    });
    await done;
    expect(await toMarkdown(view.state.doc.toJSON())).toBe(
      "# Title\n\n![shot.png](/f/shot.png)\n\nText\n",
    );
  });

  it("removes the placeholder and reports a failed upload", async () => {
    const onError = vi.fn();
    const view = await editorOf("Text\n", { accept: media });
    const [done] = startUploads(view, [png], 3, {
      accept: media,
      upload: () => Promise.reject(new Error("413")),
      onError,
    });
    await done;
    expect(uploadKey.getState(view.state)?.find()).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(new Error("413"), png);
    expect(await toMarkdown(view.state.doc.toJSON())).toBe("Text\n");
  });

  it("leaves files it doesn't accept alone", async () => {
    const view = await editorOf("Text\n", { accept: media });
    const notes = new File(["x"], "notes.txt", { type: "text/plain" });
    expect(
      startUploads(view, [notes], 1, { accept: media, upload: async () => "/f/notes.txt" }),
    ).toEqual([]);
  });
});
