import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface UploadOptions {
  /**
   * Sends one file and resolves with the URL the document links to. Call `progress` with a fraction from 0 to 1 as the
   * bytes go; `fetch` can't report them, so use XMLHttpRequest's `upload.onprogress`. Without it, nothing uploads.
   */
  upload?: (file: File, progress: (fraction: number) => void) => Promise<string>;
  /** Which files to take from a paste or a drop. Images, video, and audio by default. */
  accept: (file: File) => boolean;
  /** Called when `upload` rejects. The placeholder is gone by then. */
  onError?: (error: unknown, file: File) => void;
}

/** What a placeholder shows while its file uploads. */
export interface PendingUpload {
  id: number;
  file: File;
  /** From 0 to 1, or `null` until the first progress report. */
  fraction: number | null;
  /** A `blob:` URL for an image or video's preview, for this browser only. */
  preview?: string;
}

/** The state an editor view gives the plugin: a test can pass a plain object. */
interface View {
  readonly state: EditorState;
  dispatch(tr: Transaction): void;
}

type Meta =
  | { add: { id: number; pos: number; batch: symbol } }
  | { remove: number; batch?: symbol };

export const uploadKey = new PluginKey<DecorationSet>("comarkUpload");

const acceptMedia = (file: File) => /^(?:image|video|audio)\//.test(file.type);

/** Where placeholder `id` sits now, after every edit since it was added. */
export function findUpload(state: EditorState, id: number) {
  return uploadKey.getState(state)?.find(undefined, undefined, (spec) => spec.id === id)[0]?.from;
}

// A placeholder's element lives as long as its widget, and progress reports update it in place rather than through a
// transaction per percent.
function placeholder(pending: PendingUpload) {
  const root = document.createElement("span");
  root.className = "cue-upload";
  root.contentEditable = "false";
  root.dataset.kind = pending.file.type.split("/")[0];
  if (pending.preview && root.dataset.kind === "image") {
    const image = document.createElement("img");
    image.src = pending.preview;
    image.alt = "";
    root.append(image);
  } else if (pending.preview && root.dataset.kind === "video") {
    const video = document.createElement("video");
    video.src = pending.preview;
    video.muted = true;
    root.append(video);
  }
  const label = document.createElement("span");
  label.className = "cue-upload-label";
  label.setAttribute("role", "status");
  root.append(label);
  const show = (fraction: number | null) => {
    root.style.setProperty(
      "--cue-upload",
      fraction === null ? "0%" : `${Math.round(fraction * 100)}%`,
    );
    label.textContent =
      fraction === null
        ? `Uploading ${pending.file.name}`
        : `Uploading ${pending.file.name}, ${Math.round(fraction * 100)}%`;
  };
  show(pending.fraction);
  return { root, show };
}

/**
 * Uploads `files` into the document at `pos`. Each shows a placeholder there until its URL comes back, then becomes an
 * image node, which comark-media plays when its URL ends in a video or audio extension. The placeholder is a
 * decoration, so a collaborative room never sees a file that hasn't finished.
 */
export function startUploads(view: View, files: File[], pos: number, options: UploadOptions) {
  const { upload } = options;
  if (!upload) return [];
  const batch = Symbol();
  return files.flatMap((file) =>
    options.accept(file) ? [send(view, file, pos, upload, options, batch)] : [],
  );
}

type Send = NonNullable<UploadOptions["upload"]>;

function send(
  view: View,
  file: File,
  pos: number,
  upload: Send,
  options: UploadOptions,
  batch: symbol,
) {
  const pending: PendingUpload = { id: nextId++, file, fraction: null };
  if (/^(?:image|video)\//.test(file.type)) pending.preview = URL.createObjectURL(file);
  pendingUploads.set(pending.id, pending);
  view.dispatch(
    view.state.tr.setMeta(uploadKey, { add: { id: pending.id, pos, batch } } satisfies Meta),
  );
  const finish = () => {
    pendingUploads.delete(pending.id);
    if (pending.preview) URL.revokeObjectURL(pending.preview);
  };
  return upload(file, (fraction) => {
    pending.fraction = Math.min(1, Math.max(0, fraction));
    elements.get(pending.id)?.show(pending.fraction);
  }).then(
    (src) => {
      const at = findUpload(view.state, pending.id);
      const tr = view.state.tr.setMeta(uploadKey, { remove: pending.id, batch } satisfies Meta);
      // Deleted along with the text around it: the upload still finished, but nothing asks for it here.
      if (at !== undefined)
        insertImage(tr, at, view.state.schema.nodes.image!.create({ src, alt: file.name }));
      view.dispatch(tr);
      finish();
      return src;
    },
    (error: unknown) => {
      view.dispatch(view.state.tr.setMeta(uploadKey, { remove: pending.id } satisfies Meta));
      finish();
      options.onError?.(error, file);
      return undefined;
    },
  );
}

function insertImage(tr: Transaction, pos: number, image: PMNode) {
  const $pos = tr.doc.resolve(pos);
  if ($pos.parent.inlineContent) tr.insert(pos, image);
  else tr.insert(pos, tr.doc.type.schema.nodes.paragraph!.create(null, image));
}

let nextId = 1;
const pendingUploads = new Map<number, PendingUpload>();
const elements = new Map<number, ReturnType<typeof placeholder>>();

function uploadWidget(pos: number, id: number, batch: symbol) {
  return Decoration.widget(
    pos,
    () => {
      const element = placeholder(
        pendingUploads.get(id) ?? { id, file: new File([], ""), fraction: null },
      );
      elements.set(id, element);
      return element.root;
    },
    { id, batch, key: String(id), side: -1, destroy: () => elements.delete(id) },
  );
}

/** The plugin alone, for a ProseMirror editor without Tiptap. */
export function uploadPlugin(options: UploadOptions) {
  const filesOf = (list: FileList | null | undefined) =>
    Array.from(list ?? []).filter(options.accept);
  return new Plugin<DecorationSet>({
    key: uploadKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        let next = set.map(tr.mapping, tr.doc);
        const meta: Meta | undefined = tr.getMeta(uploadKey);
        if (meta && "add" in meta) {
          const { id, pos, batch } = meta.add;
          next = next.add(tr.doc, [uploadWidget(pos, id, batch)]);
        } else if (meta && "remove" in meta) {
          // Later files in this batch belong after this insertion, even if they finish first.
          // Ordinary edits still use side: -1 so typing at a placeholder keeps it in place.
          if (meta.batch) {
            for (const widget of set.find(
              undefined,
              undefined,
              (spec) => spec.batch === meta.batch && spec.id > meta.remove,
            )) {
              next = next.remove(
                next.find(undefined, undefined, (spec) => spec.id === widget.spec.id),
              );
              next = next.add(tr.doc, [
                uploadWidget(tr.mapping.map(widget.from, 1), widget.spec.id, meta.batch),
              ]);
            }
          }
          next = next.remove(next.find(undefined, undefined, (spec) => spec.id === meta.remove));
        }
        return next;
      },
    },
    props: {
      decorations: (state) => uploadKey.getState(state),
      handlePaste(view, event) {
        const files = filesOf(event.clipboardData?.files);
        if (!files.length || !options.upload) return false;
        // Each upload settles on its own and reports a failure through onError.
        void Promise.all(startUploads(view, files, view.state.selection.from, options));
        return true;
      },
      handleDrop(view, event, _slice, moved) {
        const files = filesOf(event.dataTransfer?.files);
        if (moved || !files.length || !options.upload) return false;
        const pos =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        void Promise.all(startUploads(view, files, pos, options));
        return true;
      },
    },
  });
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comarkUpload: {
      /** Uploads files at the cursor, as a paste would, such as the ones a file picker returns. */
      uploadFiles: (files: File[]) => ReturnType;
    };
  }
}

/** Uploads pasted and dropped files, with a placeholder that shows the progress. Pass `upload` to turn it on. */
export const Upload = Extension.create<UploadOptions>({
  name: "comarkUpload",
  addOptions: () => ({ upload: undefined, accept: acceptMedia, onError: undefined }),
  addProseMirrorPlugins() {
    return [uploadPlugin(this.options)];
  },
  addCommands() {
    return {
      uploadFiles:
        (files) =>
        ({ view }) => {
          if (!this.options.upload) return false;
          void Promise.all(startUploads(view, files, view.state.selection.from, this.options));
          return true;
        },
    };
  },
});
