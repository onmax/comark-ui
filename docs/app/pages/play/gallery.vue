<script setup lang="ts">
// The component gallery, as in Nuxt UI's and Radix Themes' playgrounds: every example on the site on one canvas, a row
// per package that pans and zooms, each in a frame of its own in light, dark, or both. A frame is its own document,
// which docs/tools.ts writes, so the plugins' scripts run and ids don't collide. docs/gallery.ts edits an example's
// props, copies it, or spreads one prop over its values, and renders the result in the browser.
import "~/assets/tools.css";
import "~/assets/gallery.css";
import groups from "~~/.generated/tools-data/gallery.json";

useDocsSeo({
  title: "Component gallery",
  description:
    "Every example in the docs on one page, in light and dark. Change a block's props or spread one over its values.",
});

// How wide a package's frames are: a screenshot, a terminal, or code needs room to read, a chart or an embed less,
// since it scales, and a badge or a key hardly any. Every other package takes the middle width.
const frameWidths: Record<string, string> = {
  annotate: "34rem",
  // The cards go in a margin that opens at 50rem.
  comments: "56rem",
  recipes: "38rem",
  cast: "32rem",
  diff: "32rem",
  code: "30rem",
  "code-notes": "30rem",
  table: "30rem",
  carousel: "30rem",
  charts: "28rem",
  embed: "28rem",
  media: "28rem",
  badge: "18rem",
  chips: "18rem",
  cjk: "18rem",
  colors: "18rem",
  critic: "18rem",
  icon: "18rem",
  keys: "18rem",
  mark: "18rem",
  qr: "18rem",
};
const icon = (name: string) => (name.includes(":") ? name : `i-lucide-${name}`);
const searchName = (group: (typeof groups)[number], label: string, id: string) =>
  `${group.label} ${group.npm} ${label} ${id}`.toLowerCase();

// The inspector's icons, which docs/gallery.ts clones from a <template> into the rows it builds.
const svg = (body: string, size: number) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
const stroke =
  'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"';
const inspectorIcons = [
  [
    "spread",
    `<g ${stroke}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18m6-18v18"/></g>`,
    13,
  ],
  ["remove", `<path ${stroke} d="M18 6L6 18M6 6l12 12"/>`, 13],
  ["on", `<path ${stroke} d="M20 6L9 17l-5-5"/>`, 11],
  ["off", `<path ${stroke} d="M5 12h14m-7-7v14"/>`, 11],
] as const;

const root = ref<HTMLElement>();
let stop: (() => void) | undefined;
let gone = false;
onMounted(async () => {
  const [{ startGallery }, { indicate }, data] = await Promise.all([
    import("~~/gallery.ts"),
    import("~~/seg.ts"),
    $fetch<import("~~/gallery.ts").GalleryData>("/play/gallery/data.json"),
  ]);
  if (gone || !root.value) return;
  root.value.querySelector(".gallery-inspector")?.append(
    Object.assign(document.createElement("template"), {
      className: "gallery-icons",
      innerHTML: inspectorIcons
        .map(([name, body, size]) => `<span data-icon="${name}">${svg(body, size)}</span>`)
        .join(""),
    }),
  );
  const switches = [...root.value.querySelectorAll<HTMLElement>(".seg")].map((group) =>
    indicate(group),
  );
  const stopGallery = startGallery(root.value, data);
  stop = () => {
    stopGallery();
    for (const unswitch of switches) unswitch();
  };
});
onBeforeUnmount(() => {
  gone = true;
  stop?.();
});
</script>

<template>
  <div ref="root" class="tool tool-layout">
    <nav class="tool-index gallery-index" aria-label="Playground">
      <p class="tool-index-title">Playground</p>
      <NuxtLink to="/play">Playground</NuxtLink>
      <NuxtLink to="/play/gallery" aria-current="page">Component gallery</NuxtLink>
      <label class="gallery-filter">
        <UIcon name="i-lucide-search" class="size-3.5" />
        <input
          type="search"
          placeholder="Filter components"
          aria-label="Filter components"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <template v-for="group in groups" :key="group.slug">
        <p class="nav-group" :data-gallery-group="group.slug">
          <UIcon :name="icon(group.icon)" class="size-3.5" />{{ group.label }}
        </p>
        <a
          v-for="example in group.examples"
          :key="example.id"
          :href="`#${example.id}`"
          :data-gallery="example.id"
          >{{ example.label }}</a
        >
      </template>
    </nav>
    <div class="gallery" data-scheme="light">
      <div class="gallery-canvas">
        <div class="gallery-sizer">
          <div class="gallery-stage">
            <div class="hero">
              <h1>Component gallery</h1>
              <p>
                Every example in the docs, a row per package. Drag or scroll to move around, pinch
                to zoom, and pick one to change its props, copy it, or spread a prop over its
                values.
              </p>
            </div>
            <p class="gallery-empty" hidden>No component matches the filter.</p>
            <section
              v-for="group in groups"
              :key="group.slug"
              class="gallery-group"
              :data-group="group.slug"
              :style="{ '--frame': frameWidths[group.slug] ?? '24rem' }"
            >
              <h2>
                <UIcon :name="icon(group.icon)" class="size-[15px]" />{{ group.label
                }}<small v-if="group.npm" class="mono">{{ group.npm }}</small>
              </h2>
              <div class="gallery-cells">
                <article
                  v-for="example in group.examples"
                  :id="example.id"
                  :key="example.id"
                  class="gallery-item"
                  :data-cell="example.playable ? example.id : undefined"
                  :data-name="searchName(group, example.label, example.id)"
                >
                  <div class="gallery-head">
                    <h3>
                      <a :href="`#${example.id}`">{{ example.label }}</a>
                    </h3>
                    <span class="gallery-actions">
                      <template v-if="example.playable">
                        <button
                          type="button"
                          class="gallery-action"
                          data-action="edit"
                          aria-label="Edit props"
                          title="Edit props"
                        >
                          <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
                        </button>
                        <button
                          type="button"
                          class="gallery-action"
                          data-action="duplicate"
                          aria-label="Duplicate"
                          title="Duplicate"
                        >
                          <UIcon name="i-lucide-copy-plus" class="size-3.5" />
                        </button>
                        <button
                          type="button"
                          class="gallery-action"
                          data-action="remove"
                          aria-label="Remove"
                          title="Remove"
                          hidden
                        >
                          <UIcon name="i-lucide-x" class="size-3.5" />
                        </button>
                        <a
                          class="gallery-action"
                          data-action="play"
                          :href="example.play"
                          aria-label="Open in the playground"
                          title="Open in the playground"
                          ><UIcon name="i-lucide-flask-conical" class="size-3.5"
                        /></a>
                      </template>
                      <NuxtLink
                        class="gallery-action"
                        :to="example.page"
                        aria-label="Docs"
                        title="Docs"
                        ><UIcon name="i-lucide-book-open" class="size-3.5"
                      /></NuxtLink>
                    </span>
                  </div>
                  <div class="gallery-frames">
                    <iframe
                      v-for="scheme in ['light', 'dark']"
                      :key="scheme"
                      class="gallery-frame"
                      :data-scheme="scheme"
                      :src="`/play/gallery/${example.id}.html`"
                      loading="lazy"
                      :title="`${example.label}, ${scheme}`"
                    />
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>
      <div class="gallery-bar">
        <div class="seg gallery-scheme" role="group" aria-label="Color scheme">
          <button type="button" data-scheme="light" aria-pressed="true">Light</button>
          <button type="button" data-scheme="dark" aria-pressed="false">Dark</button>
          <button type="button" data-scheme="both" aria-pressed="false">Both</button>
        </div>
        <div class="gallery-zoom" role="group" aria-label="Zoom">
          <button
            type="button"
            class="gallery-action"
            data-action="zoom-out"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <UIcon name="i-lucide-minus" class="size-3.5" />
          </button>
          <button
            type="button"
            class="gallery-zoom-level"
            data-action="zoom-reset"
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            100%
          </button>
          <button
            type="button"
            class="gallery-action"
            data-action="zoom-in"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <UIcon name="i-lucide-plus" class="size-3.5" />
          </button>
        </div>
        <button type="button" class="button gallery-clear" hidden>
          <UIcon name="i-lucide-rotate-ccw" class="size-[15px]" />Clear changes
        </button>
        <button type="button" class="button gallery-link" hidden>
          <UIcon name="i-lucide-link" class="size-3.5" />Copy link
        </button>
        <p class="gallery-sharing-issue" role="alert" hidden />
      </div>
      <section
        class="gallery-inspector"
        role="dialog"
        aria-labelledby="gallery-inspector-title"
        tabindex="-1"
        hidden
      >
        <div class="gallery-inspector-head">
          <h2 id="gallery-inspector-title" />
          <p class="mono" />
          <span class="gallery-inspector-actions">
            <button
              type="button"
              class="gallery-action"
              data-action="duplicate"
              aria-label="Duplicate"
              title="Duplicate"
            >
              <UIcon name="i-lucide-copy-plus" class="size-3.5" />
            </button>
            <button
              type="button"
              class="gallery-action"
              data-action="reset"
              aria-label="Reset"
              title="Reset"
              hidden
            >
              <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
            </button>
            <button
              type="button"
              class="gallery-action"
              data-action="remove"
              aria-label="Remove the copy"
              title="Remove the copy"
              hidden
            >
              <UIcon name="i-lucide-trash" class="size-3.5" />
            </button>
            <button
              type="button"
              class="gallery-action"
              data-action="copy"
              aria-label="Copy the Markdown"
              title="Copy the Markdown"
            >
              <UIcon name="i-lucide-copy" class="size-3.5" />
            </button>
            <a
              class="gallery-action"
              data-action="play"
              href="/play"
              aria-label="Open in the playground"
              title="Open in the playground"
              ><UIcon name="i-lucide-flask-conical" class="size-3.5"
            /></a>
            <button
              type="button"
              class="gallery-action"
              data-action="side"
              aria-label="Move to the other side"
              title="Move to the other side"
            >
              <UIcon name="i-lucide-arrow-left-right" class="size-3.5" />
            </button>
            <button
              type="button"
              class="gallery-action"
              data-action="close"
              aria-label="Close"
              title="Close"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </span>
        </div>
        <div class="gallery-inspector-body">
          <div class="gallery-props" />
          <p class="gallery-inspector-label">Markdown</p>
          <div class="gallery-source">
            <div class="gallery-paint" aria-hidden="true" />
            <textarea
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
              aria-label="Markdown"
            />
          </div>
          <ul class="gallery-issues" aria-label="Issues" aria-live="polite" hidden />
        </div>
        <span class="gallery-inspector-edge" data-edge="left" aria-hidden="true" />
        <span class="gallery-inspector-edge" data-edge="right" aria-hidden="true" />
        <span class="gallery-inspector-edge" data-edge="bottom" aria-hidden="true" />
        <button
          type="button"
          class="gallery-inspector-grip"
          aria-label="Resize the inspector"
          title="Drag to resize, or use the arrow keys"
        >
          <svg
            viewBox="0 0 10 10"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M9 2 2 9M9 6 6 9" />
          </svg>
        </button>
      </section>
    </div>
  </div>
</template>
