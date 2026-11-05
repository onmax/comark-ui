<script setup lang="ts">
// The playground, as the old site drew it: the presets' column, the editor with its Markdown, Config, and Theme
// panes, and the preview. docs/tools.ts renders the first preset's colored Markdown, the presets, and their stills;
// docs/play.ts runs it all in the browser.
import "~/assets/tools.css";
import "~/assets/play.css";
import first from "~~/.generated/tools-data/play.json";
import { colorTokens, themePresets } from "~~/play-theme.ts";

useDocsSeo({
  title: "Playground",
  description:
    "Write Comark with every plugin and see it rendered as you type. Start from any example in the docs.",
});

const capitalize = (word: string) => `${word[0]?.toUpperCase()}${word.slice(1)}`;
const root = ref<HTMLElement>();
const column = ref<HTMLElement>();
const npm = ref(first.npm);
let stop: (() => void) | undefined;
let gone = false;

onMounted(async () => {
  const [{ startPlayground }, { indicate }, presets, stills] = await Promise.all([
    import("~~/play.ts"),
    import("~~/seg.ts"),
    $fetch<{ id: string; source: string; npm: string }[]>("/play/presets.json"),
    $fetch<string>("/play/presets.html", { responseType: "text" }),
  ]);
  if (gone || !root.value || !column.value) return;
  column.value.innerHTML = stills;
  const switches = [...root.value.querySelectorAll<HTMLElement>(".seg")].map((group) =>
    indicate(group),
  );
  const stopPlayground = await startPlayground(root.value, presets, (name) => (npm.value = name));
  stop = () => {
    stopPlayground();
    for (const unswitch of switches) unswitch();
  };
  if (gone) stop();
});
onBeforeUnmount(() => {
  gone = true;
  stop?.();
});
</script>

<template>
  <div ref="root" class="tool tool-layout">
    <nav class="tool-index play-presets" aria-label="Playground">
      <p class="tool-index-title">Playground</p>
      <NuxtLink to="/play/gallery">Component gallery</NuxtLink>
      <div ref="column" />
    </nav>
    <div class="play">
      <div class="play-editor">
        <div class="play-bar">
          <div class="seg play-panes" role="group" aria-label="Editor">
            <button type="button" data-pane="markdown" aria-pressed="true">Markdown</button>
            <button type="button" data-pane="config" aria-pressed="false">Config</button>
            <button type="button" data-pane="theme" aria-pressed="false">Theme</button>
          </div>
          <div class="play-bar-end">
            <a
              class="play-npmx"
              :href="`https://npmx.dev/package/${npm}`"
              :title="`${npm} on npmx`"
              target="_blank"
              rel="noopener"
              ><span aria-hidden="true">./</span> {{ npm }}</a
            >
            <button type="button" class="play-share">Copy link</button>
          </div>
        </div>
        <div class="play-tools">
          <button
            type="button"
            class="play-reset"
            aria-label="Reset to the example"
            title="Reset to the example"
            hidden
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button type="button" class="play-copy" aria-label="Copy the Markdown" title="Copy">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="14" height="14" rx="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <svg class="check" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20 6 9 17l-5-5"
              />
            </svg>
          </button>
        </div>
        <dialog class="play-confirm" aria-labelledby="play-confirm-title">
          <form method="dialog">
            <h2 id="play-confirm-title">Reset to the example?</h2>
            <p>Your changes to the Markdown will be lost.</p>
            <div>
              <button value="cancel" autofocus>Cancel</button><button value="reset">Reset</button>
            </div>
          </form>
        </dialog>
        <div class="play-code" data-pane="markdown">
          <div class="play-paint" aria-hidden="true" v-html="first.sourcePaint" />
          <!-- Once: Vue sets a field's value on every render, which would undo docs/play.ts's. -->
          <textarea
            v-once
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label="Markdown"
            :value="first.source"
          />
        </div>
        <div class="play-code" data-pane="config" hidden>
          <div class="play-paint" aria-hidden="true" v-html="first.configPaint" />
          <textarea
            v-once
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label="Config"
            :value="first.config"
          />
        </div>
        <div class="play-theme" data-pane="theme" hidden>
          <div class="play-theme-bar">
            <div class="seg play-scheme" role="group" aria-label="Preview colors">
              <button type="button" data-scheme="light" aria-pressed="true">Light</button>
              <button type="button" data-scheme="dark" aria-pressed="false">Dark</button>
            </div>
            <div class="play-theme-actions">
              <button type="button" class="play-theme-reset" hidden>Reset</button>
              <button type="button" class="play-theme-copy">Copy CSS</button>
            </div>
          </div>
          <div class="play-theme-field">
            <span id="play-theme-presets">Preset</span>
            <div class="seg play-theme-presets" role="group" aria-labelledby="play-theme-presets">
              <button
                v-for="(preset, index) in themePresets"
                :key="preset.id"
                type="button"
                :data-theme="preset.id"
                :aria-pressed="index === 0"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
          <div class="play-tokens">
            <template v-for="token in colorTokens" :key="token">
              <label :for="`play-token-${token}`"
                >{{ capitalize(token) }}<code aria-hidden="true">--comark-{{ token }}</code></label
              >
              <input type="color" :data-swatch="token" :aria-label="`Pick the ${token} color`" />
              <input
                :id="`play-token-${token}`"
                type="text"
                :data-token="token"
                spellcheck="false"
                autocapitalize="off"
                autocomplete="off"
              />
            </template>
            <label for="play-token-radius"
              >Radius<code aria-hidden="true">--comark-radius</code></label
            >
            <input
              type="range"
              data-slider="radius"
              min="0"
              max="1.5"
              step="0.125"
              value="0.625"
              aria-label="Radius in rem"
            />
            <input
              id="play-token-radius"
              type="text"
              data-token="radius"
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
            />
            <label for="play-token-font">Font<code aria-hidden="true">--comark-font</code></label>
            <span />
            <input
              id="play-token-font"
              type="text"
              data-token="font"
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
            />
          </div>
          <details class="play-theme-field play-theme-extra">
            <summary>Extra CSS</summary>
            <p>
              Each plugin's own variables, like <code>--cc-*</code> or <code>--ck-*</code>, or any
              rule, applied to the preview.
            </p>
            <textarea
              id="play-theme-css"
              aria-label="Extra CSS"
              spellcheck="false"
              autocapitalize="off"
              autocomplete="off"
              placeholder=":root { --cc-gap: 2rem; --ck-inset: 0.5rem }"
            />
          </details>
        </div>
        <ul class="play-issues" aria-label="Issues" aria-live="polite" hidden />
      </div>
      <iframe class="play-preview" title="Preview" />
    </div>
  </div>
</template>

<style>
/* The package the preset documents, which the old site's header showed. */
.play-bar-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.play-npmx {
  color: var(--faint);
  font: 0.75rem/1.5 var(--mono);
  text-decoration: none;
}

.play-npmx:hover {
  color: var(--fg);
}
</style>
