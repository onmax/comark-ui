<script setup lang="ts">
// `::landing-hero`: the landing's headline and pitch beside the install command, the way in, and the repository.
// Humans install the packages with their package manager; agents install the comark-ui skill.
import landing from "../../../.generated/landing.json";

const props = defineProps<{ install: string }>();

const audiences = [
  { label: "For humans", icon: "i-lucide-user", value: "humans" },
  { label: "For agents", icon: "i-lucide-bot", value: "agents" },
];
const managers = ["pnpm", "npm", "yarn", "bun"].map((value) => ({ label: value, value }));
const audience = ref("humans");
const manager = ref("pnpm");
const packages = computed(() => props.install.replace(/^pnpm add /, ""));
const command = computed(() => {
  if (audience.value === "agents") return "vp dlx skills add onmax/comark-ui";
  const add = { pnpm: "pnpm add", npm: "npm install", yarn: "yarn add", bun: "bun add" }[
    manager.value
  ];
  return `${add} ${packages.value}`;
});
// A raised pill on a muted track, as a segmented control.
const segmented = {
  indicator: "bg-default shadow-xs ring ring-default",
  trigger: "data-[state=active]:text-highlighted!",
};
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
async function copy(text: string) {
  await navigator.clipboard.writeText(text);
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1200);
}

const stars =
  landing.stars == null
    ? undefined
    : new Intl.NumberFormat("en", { notation: "compact" }).format(landing.stars);
</script>

<template>
  <section class="landing-hero">
    <div class="landing-hero-pitch">
      <slot />
      <div class="landing-hero-links">
        <DocsPageHeaderLinks />
        <UButton
          to="https://github.com/onmax/comark-ui"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-simple-icons-github"
          :aria-label="`comark-ui on GitHub${stars ? `, ${landing.stars} stars` : ''}`"
        >
          GitHub
          <span v-if="stars" class="landing-hero-stars"
            ><UIcon name="i-lucide-star" />{{ stars }}</span
          >
        </UButton>
      </div>
    </div>

    <div>
      <div class="landing-installer">
        <div class="landing-installer-bar">
          <UTabs
            v-model="audience"
            :items="audiences"
            :content="false"
            variant="pill"
            size="xs"
            :ui="segmented"
            aria-label="Audience"
          />
          <UTabs
            v-if="audience === 'humans'"
            v-model="manager"
            :items="managers"
            :content="false"
            variant="pill"
            size="xs"
            :ui="segmented"
            aria-label="Package manager"
          />
        </div>
        <p v-if="audience === 'agents'" class="landing-installer-note">
          Install the <a href="https://viteplus.dev/guide/global-cli">global Vite+ CLI</a> before
          running this command. Without it, replace <code>vp dlx</code> with <code>pnpm dlx</code>.
        </p>
        <button
          type="button"
          class="landing-install"
          title="Copy the install command"
          @click="void copy(command)"
        >
          <span aria-hidden="true">$</span>
          <code>{{ command }}</code>
          <UIcon
            :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            class="landing-install-icon"
            :class="{ copied }"
          />
          <span class="sr-only" aria-live="polite">{{ copied ? "Copied" : "" }}</span>
        </button>
      </div>
      <div class="landing-hero-actions">
        <UButton
          to="/play"
          color="neutral"
          size="lg"
          icon="i-lucide-flask-conical"
          label="Open the playground"
        />
        <UButton
          to="/introduction"
          color="neutral"
          variant="outline"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          label="Read the docs"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: end;
  gap: 2rem 4rem;
  width: var(--column);
  margin-inline: auto;
  padding: 5rem 0 3rem;
}

.landing-hero-pitch :deep(h1) {
  max-width: 13ch;
  margin: 0 0 1.25rem;
  color: var(--fg);
  font-size: clamp(2.5rem, 1.5rem + 3.5vw, 4.25rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

/* The headline isn't a section to link to. */
.landing-hero-pitch :deep(h1 a) {
  pointer-events: none;
}

.landing-hero-pitch :deep(h1 a > span:first-child) {
  display: none;
}

.landing-hero-pitch :deep(p) {
  max-width: 28rem;
  margin: 0;
  color: var(--muted);
  font-size: 1.125rem;
  line-height: 1.75;
}

.landing-hero-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.75rem;
}

.landing-hero-stars {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.landing-installer-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.landing-installer-note {
  margin: 0 0 0.5rem;
  color: var(--muted);
  font-size: 0.8125rem;
}

.landing-installer-note a {
  color: var(--fg);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.landing-install {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-width: 0;
  height: 2.75rem;
  padding: 0 0.875rem 0 1rem;
  border-radius: var(--r-md);
  background: var(--bg);
  box-shadow: inset 0 0 0 1px var(--line);
  color: var(--faint);
  font: 0.875rem/1 var(--mono);
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow 150ms ease,
    scale 160ms var(--ease-out);
}

.landing-install:hover {
  box-shadow: inset 0 0 0 1px var(--faint);
}

.landing-install:active {
  scale: 0.97;
}

.landing-install code {
  flex: 1;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  min-width: 0;
  overflow: hidden;
  color: var(--fg);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.landing-install-icon {
  flex: none;
  color: var(--muted);
}

.landing-install-icon.copied {
  color: #16a34a;
}

.landing-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.75rem;
}

@media (max-width: 60rem) {
  .landing-hero {
    grid-template-columns: minmax(0, 1fr);
    padding-top: 3rem;
  }
}
</style>
