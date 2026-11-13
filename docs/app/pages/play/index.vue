<script setup lang="ts">
// PlaygroundRender runs the presets, the Markdown, Config, and Theme panes, and the preview. docs/tools.ts writes the
// presets with their stills; docs/play.ts renders them.
import "~/assets/tools.css";
import "~/assets/play.css";
import { PlaygroundRender } from "@vite-hub/ui-playground/playground-render";
import { configFile, contentFile, themeFile } from "~~/play-link.ts";
import type { Preset } from "~~/play.ts";

useDocsSeo({
  title: "Playground",
  description:
    "Write Comark with every plugin and see it rendered as you type. Start from any example in the docs.",
});

type Play = typeof import("~~/play.ts");
const panes = [
  { file: contentFile, label: "Markdown", language: "mdc" },
  { file: configFile, label: "Config", language: "json" },
  { file: themeFile, label: "Theme", slot: "theme" },
];
const languages = [
  () => import("comark/plugins/shiki/language-comark").then((module) => module.comarkLanguages),
  () => import("shiki/langs/json.mjs"),
];

const play = shallowRef<{ module: Play; styles: string; presets: Preset[] }>();
const presetOf = (id?: string) => play.value?.presets.find((preset) => preset.id === id);
// A shared link's Markdown could use any package, so it gets comark-ui, which installs all of them.
const npmOf = (id?: string) => presetOf(id)?.npm || "comark-ui";
const root = ref<HTMLElement>();
let stop: (() => void) | undefined;
let gone = false;

onMounted(async () => {
  const [module, { styles, presets }] = await Promise.all([
    import("~~/play.ts"),
    $fetch<{ styles: string; presets: Preset[] }>("/play/presets.json"),
  ]);
  if (gone) return;
  play.value = { module, styles, presets };
  await nextTick();
  const column = root.value?.querySelector<HTMLElement>(".vh-pg-presets");
  if (column) stop = module.watchPresets(column);
});
onBeforeUnmount(() => {
  gone = true;
  stop?.();
});
</script>

<template>
  <div ref="root" class="tool play">
    <!-- The stills' plugin styles, once for the whole column. -->
    <div v-if="play" hidden v-html="play.styles" />
    <PlaygroundRender
      v-if="play"
      :presets="play.presets"
      :panes
      :languages
      :render="play.module.render"
      :preview-document="play.module.playDocument"
    >
      <template #preset="{ preset }">
        <span class="preset-thumb" aria-hidden="true" inert>
          <span class="preset-page" v-html="presetOf(preset.id)?.still" />
        </span>
        <span class="preset-label">{{ preset.label }}</span>
      </template>
      <template #toolbar="{ preset }">
        <a
          class="play-npmx"
          :href="`https://npmx.dev/package/${npmOf(preset?.id)}`"
          :title="`${npmOf(preset?.id)} on npmx`"
          target="_blank"
          rel="noopener"
          ><span aria-hidden="true">./</span> {{ npmOf(preset?.id) }}</a
        >
        <NuxtLink to="/play/gallery" class="play-gallery">Gallery</NuxtLink>
      </template>
      <template #theme="{ value, setFile }">
        <PlayTheme :value :set="(contents: string) => setFile(themeFile, contents)" />
      </template>
    </PlaygroundRender>
  </div>
</template>
