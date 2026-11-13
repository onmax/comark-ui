<script setup lang="ts">
// The playground's Theme pane, in PlaygroundRender's `theme` slot. It reads and writes `theme.json`, and the preview
// renders with it. Each swatch and placeholder shows the color the preview draws, read from a hidden copy of the
// preview's page: the preview runs in a sandbox, so this page can't read it.
import {
  colorTokens,
  readTheme,
  schemeCss,
  themeCss,
  themePresets,
  themeText,
  tokens,
  type Theme,
  type Token,
} from "~~/play-theme.ts";
import { previewDocument } from "~~/preview.ts";
import { indicate } from "~~/seg.ts";

const props = defineProps<{ value: string; set: (contents: string) => void }>();

const theme = computed(() => readTheme(props.value).theme);
// The pane only renders in the browser: the page mounts the playground once its presets load.
const system = matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(system.matches);
const followSystem = () => (systemDark.value = system.matches);
const scheme = computed(() => theme.value.scheme ?? (systemDark.value ? "dark" : "light"));
const preset = computed(() => themePresets.find(({ id }) => id === theme.value.preset));
const edited = computed(
  () =>
    !!preset.value &&
    (preset.value.css !== theme.value.css ||
      tokens.some(
        (token) => (preset.value?.tokens[token] ?? "") !== (theme.value.tokens[token] ?? ""),
      )),
);
const capitalize = (word: string) => `${word[0]?.toUpperCase()}${word.slice(1)}`;
const write = (next: Theme) => props.set(themeText(next));

// A value keeps its spaces while it's typed; an empty one is dropped, so the preview falls back.
function setToken(token: Token, value: string) {
  const next = { ...theme.value.tokens };
  if (value.trim()) next[token] = value;
  else delete next[token];
  write({ ...theme.value, tokens: next });
}
// Extra CSS stays folded until there is some to show.
const extraOpen = ref(!!theme.value.css);
function pickPreset(id: string) {
  const next = themePresets.find((candidate) => candidate.id === id);
  if (!next) return;
  extraOpen.value = !!next.css;
  write({ preset: id, tokens: { ...next.tokens }, css: next.css, scheme: theme.value.scheme });
}

const copyLabel = ref("Copy CSS");
async function copyCss() {
  copyLabel.value = await navigator.clipboard
    .writeText(themeCss(theme.value) || "/* The default theme: nothing to set. */")
    .then(
      () => "Copied",
      () => "Blocked",
    );
  setTimeout(() => (copyLabel.value = "Copy CSS"), 1500);
}

// The hidden page, read through a canvas pixel that turns any CSS color, oklch or translucent, into the hex a color
// input takes, flattened onto the page's background.
const probe = ref<HTMLIFrameElement>();
const swatches = ref<Partial<Record<Token, string>>>({});
const placeholders = ref<Partial<Record<Token, string>>>({});
const radius = ref(0.625);
const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
function hex(...layers: string[]) {
  if (!pixel) return "#000000";
  pixel.clearRect(0, 0, 1, 1);
  for (const layer of layers) {
    pixel.fillStyle = layer;
    pixel.fillRect(0, 0, 1, 1);
  }
  const [red = 0, green = 0, blue = 0] = pixel.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
const shadcnNames: Partial<Record<Token, string>> = { muted: "muted-foreground" };
function read() {
  const doc = probe.value?.contentDocument;
  const view = doc?.defaultView;
  const style = doc?.getElementById("play-theme");
  if (!doc?.body || !view || !style) return;
  doc.documentElement.className = scheme.value;
  doc.documentElement.style.colorScheme = scheme.value;
  style.textContent = [schemeCss(scheme.value), themeCss(theme.value)].filter(Boolean).join("\n\n");
  const element = doc.body.appendChild(doc.createElement("i"));
  element.hidden = true;
  const color = (value: string) => {
    element.style.color = value;
    return view.getComputedStyle(element).color;
  };
  const background = color("var(--comark-background, var(--background))");
  const nextSwatches: typeof swatches.value = {};
  const nextPlaceholders: typeof placeholders.value = { radius: "0.625rem" };
  for (const token of colorTokens) {
    const fallback = `var(--${shadcnNames[token] ?? token})`;
    nextSwatches[token] = hex(background, color(`var(--comark-${token}, ${fallback})`));
    nextPlaceholders[token] = hex(background, color(fallback));
  }
  element.style.borderRadius = "var(--comark-radius, var(--radius, 0.625rem))";
  radius.value = parseFloat(view.getComputedStyle(element).borderTopLeftRadius) / 16;
  element.style.fontFamily =
    "var(--comark-font, var(--font-sans, ui-sans-serif, system-ui, sans-serif))";
  nextPlaceholders.font = view.getComputedStyle(element).fontFamily;
  element.remove();
  swatches.value = nextSwatches;
  placeholders.value = nextPlaceholders;
}
watch([theme, scheme], read);

const root = ref<HTMLElement>();
let stop: (() => void) | undefined;
onMounted(() => {
  if (probe.value) probe.value.srcdoc = previewDocument("", { scheme: scheme.value, css: "" });
  const switches = [...(root.value?.querySelectorAll<HTMLElement>(".seg") ?? [])].map((group) =>
    indicate(group),
  );
  system.addEventListener("change", followSystem);
  stop = () => {
    for (const unswitch of switches) unswitch();
    system.removeEventListener("change", followSystem);
  };
});
onBeforeUnmount(() => stop?.());
</script>

<template>
  <div ref="root" class="play-theme">
    <div class="play-theme-bar">
      <div class="seg" role="group" aria-label="Preview colors">
        <button
          v-for="option in ['light', 'dark'] as const"
          :key="option"
          type="button"
          :aria-pressed="scheme === option"
          @click="write({ ...theme, scheme: option })"
        >
          {{ capitalize(option) }}
        </button>
      </div>
      <div class="play-theme-actions">
        <button v-if="edited" type="button" @click="pickPreset(theme.preset)">Reset</button>
        <button type="button" @click="copyCss">{{ copyLabel }}</button>
      </div>
    </div>
    <div class="play-theme-field">
      <span id="play-theme-presets">Preset</span>
      <div class="seg" role="group" aria-labelledby="play-theme-presets">
        <button
          v-for="option in themePresets"
          :key="option.id"
          type="button"
          :aria-pressed="theme.preset === option.id"
          @click="pickPreset(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="play-tokens">
      <template v-for="token in colorTokens" :key="token">
        <label :for="`play-token-${token}`"
          >{{ capitalize(token) }}<code aria-hidden="true">--comark-{{ token }}</code></label
        >
        <input
          type="color"
          :value="swatches[token] ?? '#000000'"
          :aria-label="`Pick the ${token} color`"
          @input="setToken(token, ($event.target as HTMLInputElement).value)"
        />
        <input
          :id="`play-token-${token}`"
          type="text"
          :value="theme.tokens[token] ?? ''"
          :placeholder="placeholders[token]"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          @input="setToken(token, ($event.target as HTMLInputElement).value)"
        />
      </template>
      <label for="play-token-radius">Radius<code aria-hidden="true">--comark-radius</code></label>
      <input
        type="range"
        min="0"
        max="1.5"
        step="0.125"
        :value="radius"
        aria-label="Radius in rem"
        @input="setToken('radius', `${($event.target as HTMLInputElement).value}rem`)"
      />
      <input
        id="play-token-radius"
        type="text"
        :value="theme.tokens.radius ?? ''"
        :placeholder="placeholders.radius"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        @input="setToken('radius', ($event.target as HTMLInputElement).value)"
      />
      <label for="play-token-font">Font<code aria-hidden="true">--comark-font</code></label>
      <span />
      <input
        id="play-token-font"
        type="text"
        :value="theme.tokens.font ?? ''"
        :placeholder="theme.tokens.font ? undefined : placeholders.font"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        @input="setToken('font', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <details
      class="play-theme-field play-theme-extra"
      :open="extraOpen"
      @toggle="extraOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary>Extra CSS</summary>
      <p>
        Each plugin's own variables, like <code>--cc-*</code> or <code>--ck-*</code>, or any rule,
        applied to the preview.
      </p>
      <textarea
        aria-label="Extra CSS"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        placeholder=":root { --cc-gap: 2rem; --ck-inset: 0.5rem }"
        :value="theme.css"
        @input="write({ ...theme, css: ($event.target as HTMLTextAreaElement).value })"
      />
    </details>
    <iframe
      ref="probe"
      class="play-theme-probe"
      title="Theme probe"
      aria-hidden="true"
      tabindex="-1"
      @load="read"
    />
  </div>
</template>
