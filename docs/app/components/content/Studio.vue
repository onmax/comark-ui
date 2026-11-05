<script setup lang="ts">
// `::hero`, after docs/studio.ts: the Markdown beside the page rendered from it, under a bar with the steps between
// them. It rests on the fixed Markdown and page with the issue it fixed, and plays while the pointer is on it or on Play:
// data-phase steps through writing, checking, fixing, and rendering, and the stylesheet animates each. Without the
// script, or with reduced motion, it only rests.
import type { VNode } from "vue";

const props = defineProps<{
  code: string;
  lines: number;
  fix: number;
  typed: number;
  where: string;
  issue: string;
  play: string;
}>();

const slots = useSlots();
// The parser sends the intro and the page as two wrappers, in that order.
const parts = computed(() =>
  (slots.default?.() ?? []).filter((node: VNode) => typeof node.type !== "symbol"),
);

const steps = ["Write", "Check", "Fix", "Render"] as const;
type Phase = "waiting" | "write" | "check" | "fix" | "render";
const phase = ref<Phase>();
const playing = ref(false);
const canPlay = ref(false);
const current = computed(() => steps.findIndex((step) => step.toLowerCase() === phase.value));
const root = useTemplateRef<HTMLElement>("root");

let timers: ReturnType<typeof setTimeout>[] = [];
async function replay() {
  for (const timer of timers) clearTimeout(timer);
  phase.value = "waiting";
  // A style recalc at "waiting" restarts the animations from their start.
  await nextTick();
  void root.value?.offsetWidth;
  phase.value = "write";
  playing.value = true;
  const at = props.typed;
  timers = (
    [
      [at + 500, "check"],
      [at + 2900, "fix"],
      [at + 3700, "render"],
      [at + 5200, undefined],
    ] as const
  ).map(([ms, name]) =>
    setTimeout(() => {
      if (name) phase.value = name;
      else playing.value = false;
    }, ms),
  );
}
function onEnter(event: PointerEvent) {
  if (canPlay.value && event.pointerType === "mouse" && !playing.value) void replay();
}

onMounted(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // The marks and notes in the page's HTML wait for their annotation's lines to be typed.
  for (const el of root.value?.querySelectorAll<HTMLElement>("[data-at]:not([data-fixed])") ?? [])
    el.style.setProperty("--at", `${el.dataset.at}ms`);
  canPlay.value = true;
});
onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <section class="showcase">
    <component :is="parts[0]" v-if="parts[0]" />
    <div
      ref="root"
      class="studio"
      :data-phase="phase"
      :style="{ '--typed': `${typed}ms` }"
      @pointerenter="onEnter"
    >
      <div class="studio-bar">
        <span class="studio-file"><UIcon name="i-lucide-file-input" />review.md</span>
        <ol class="studio-steps" aria-label="Steps">
          <li
            v-for="(step, i) in steps"
            :key="step"
            :data-step="step.toLowerCase()"
            :data-done="phase && i < current ? '' : undefined"
            :aria-current="i === current ? 'step' : undefined"
          >
            {{ step }}
          </li>
        </ol>
        <button
          v-if="canPlay"
          type="button"
          class="studio-replay"
          aria-label="Play"
          @click="replay"
        >
          <UIcon name="i-lucide-rotate-ccw" /><span>Play</span>
        </button>
        <a class="studio-open" :href="play" aria-label="Open in playground">
          <UIcon name="i-lucide-flask-conical" /><span>Open in playground</span>
        </a>
      </div>
      <div class="studio-body">
        <div class="studio-source">
          <div class="studio-code">
            <div class="studio-gutter" aria-hidden="true">
              <span v-for="n in lines" :key="n" :data-fix="n - 1 === fix ? '' : undefined">{{
                n
              }}</span>
            </div>
            <div class="studio-pre" v-html="code" />
          </div>
          <div class="studio-problems">
            <p class="studio-issue" :aria-hidden="phase !== undefined && phase !== 'check'">
              <span class="studio-dot" aria-hidden="true" />
              <span
                ><span class="studio-fixed">Fixed</span><strong>{{ where }}</strong
                >{{ issue }}</span
              >
            </p>
            <p class="studio-ok" :aria-hidden="phase !== 'fix' && phase !== 'render'">
              <UIcon name="i-lucide-check" />No problems
            </p>
          </div>
        </div>
        <div class="studio-page">
          <component :is="parts[1]" v-if="parts[1]" />
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* Global, since the code and the annotated screenshot come in as HTML; every selector starts at `.showcase`. */
.showcase {
  width: var(--column);
  margin: 8rem auto 0;
}

.showcase .studio-intro {
  display: grid;
  margin-bottom: 2.5rem;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: end;
  gap: 1rem 4rem;
}

.showcase .studio-intro p {
  max-width: 28rem;
  margin: 0;
  color: var(--muted);
  font-size: 1.0625rem;
  line-height: 1.7;
}

.showcase .studio {
  overflow: hidden;
  border-radius: var(--r-lg);
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line);
}

.showcase .studio-bar {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 0.75rem;
  height: 2.875rem;
  padding: 0 0.375rem 0 1rem;
  border-bottom: 1px solid var(--line);
  background: var(--soft);
}

.showcase .studio-file {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--fg);
  font: 500 0.75rem/1 var(--mono);
}

.showcase .studio-file .iconify {
  color: var(--faint);
}

.showcase .studio-steps {
  display: flex;
  justify-self: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.showcase .studio-steps li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 1.75rem;
  margin: 0;
  padding: 0 0.625rem 0 0.375rem;
  border-radius: 999px;
  color: var(--faint);
  font-size: 0.75rem;
  font-weight: 500;
  counter-increment: step;
  transition:
    color 200ms ease,
    background-color 200ms ease,
    box-shadow 200ms ease;
}

.showcase .studio-steps li::before {
  content: counter(step);
  display: grid;
  place-items: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px var(--line);
  font: 600 0.625rem/1 var(--mono);
  font-variant-numeric: tabular-nums;
  transition:
    background-color 200ms ease,
    color 200ms ease,
    box-shadow 200ms ease;
}

.showcase .studio-steps [aria-current] {
  background: var(--bg);
  box-shadow: 0 0 0 1px var(--line);
  color: var(--fg);
}

.showcase .studio-steps [aria-current]::before,
.showcase .studio-steps [data-done]::before,
.showcase .studio:not([data-phase]) .studio-steps li::before {
  background: var(--fg);
  box-shadow: none;
  color: var(--bg);
}

.showcase .studio-steps [data-done],
.showcase .studio:not([data-phase]) .studio-steps li {
  color: var(--muted);
}

.showcase .studio[data-phase="check"] .studio-steps [aria-current]::before {
  background: #e5484d;
}

.showcase :is(.studio-replay, .studio-open) {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--r-sm);
  color: var(--faint);
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition:
    color 150ms ease,
    scale 160ms var(--ease-out);
}

.showcase :is(.studio-replay, .studio-open):hover {
  color: var(--fg);
}

.showcase .studio-replay:active {
  scale: 0.96;
}

.showcase .studio-body {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
}

.showcase .studio-source {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--line);
  background: var(--soft);
}

.showcase .studio-code {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding: 1.25rem 0 1.5rem;
  font: 0.8125rem/1.7 var(--mono);
}

.showcase .studio-gutter {
  display: flex;
  flex: none;
  flex-direction: column;
  padding: 0 0.75rem 0 1rem;
  color: var(--faint);
  font-variant-numeric: tabular-nums;
  text-align: right;
  user-select: none;
  transition: color 200ms ease;
}

.showcase .studio-pre {
  flex: 1;
}

.showcase .studio-pre pre {
  margin: 0;
  padding: 0 1.25rem 0 0;
  background: none !important;
  font: inherit;
  white-space: pre;
}

/* A line a block of its own width, so its reveal steps one character at a time. */
.showcase .studio-pre .line {
  display: block;
  width: fit-content;
  min-height: 1lh;
}

.dark .showcase .studio-pre span {
  color: var(--shiki-dark) !important;
}

.showcase .studio-fix {
  border-radius: 3px;
}

.showcase .studio-fix del {
  display: none;
  text-decoration: none;
}

.showcase .studio-fix ins {
  text-decoration: none;
}

.showcase .studio-problems {
  display: grid;
  min-height: 4.25rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--line);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.showcase .studio-problems p {
  display: flex;
  grid-area: 1 / 1;
  gap: 0.625rem;
  align-items: start;
  margin: 0;
  transition:
    opacity 250ms ease,
    translate 350ms var(--ease-out),
    filter 250ms ease;
}

.showcase .studio-issue {
  color: var(--fg);
}

.showcase .studio-issue strong {
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 500;
}

.showcase .studio-dot {
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.45rem;
  border-radius: 50%;
  background: #e5484d;
  box-shadow: 0 0 0 3px color-mix(in oklch, #e5484d 22%, transparent);
}

.showcase .studio-problems .studio-ok {
  align-items: center;
  color: #16a34a;
  font-weight: 500;
}

/* Out of view until its step. At rest, before anything plays, the issue shows, fixed. */
.showcase .studio-issue,
.showcase .studio:not([data-phase]) .studio-ok,
.showcase .studio:is([data-phase="fix"], [data-phase="render"]) .studio-issue,
.showcase
  .studio:is([data-phase="waiting"], [data-phase="write"], [data-phase="check"])
  .studio-ok {
  opacity: 0;
  translate: 0 0.5rem;
  filter: blur(2px);
  pointer-events: none;
}

.showcase .studio:not([data-phase]) .studio-issue,
.showcase .studio[data-phase="check"] .studio-issue {
  opacity: 1;
  translate: 0;
  filter: none;
  pointer-events: auto;
}

.showcase .studio-page {
  min-width: 0;
  padding: 1.75rem;
  background: var(--bg);
  font-size: 0.9375rem;
}

/* At a reading width, like a page, rather than the studio's. */
.showcase .studio-blocks {
  max-width: 34rem;
  margin-inline: auto;
}

.showcase .studio-block > * > :first-child,
.showcase .studio-block > :first-child {
  margin-top: 0;
}

.showcase .studio-block + .studio-block {
  margin-top: 1.5rem;
}

.showcase .studio-block > :last-child {
  margin-bottom: 0;
}

.showcase .studio-ghost {
  display: none;
}

/* At rest: the issue the plugins reported, marked fixed, and the value the agent changed for it. */
.showcase .studio:not([data-phase]) .studio-dot {
  background: #16a34a;
  box-shadow: 0 0 0 3px color-mix(in oklch, #16a34a 22%, transparent);
}

.showcase .studio-fixed {
  display: none;
}

.showcase .studio:not([data-phase]) .studio-fixed {
  display: inline;
  margin-right: 0.5rem;
  color: #15803d;
  font-weight: 500;
}

.dark .showcase .studio:not([data-phase]) .studio-fixed,
.dark .showcase .studio:not([data-phase]) .studio-gutter [data-fix] {
  color: #16a34a;
}

.showcase .studio:not([data-phase]) .studio-fix ins {
  background: color-mix(in oklch, #16a34a 18%, transparent);
}

.showcase .studio:not([data-phase]) .studio-gutter [data-fix] {
  color: #15803d;
}

/* Waiting to start: nothing typed, nothing drawn. */
.showcase .studio[data-phase="waiting"] :is(.studio-pre .line, .studio-block, .studio-gutter span) {
  visibility: hidden;
}

/* Writing: the draft types out, and each block and mark arrives once its lines are typed. */
.showcase .studio[data-phase]:not([data-phase="waiting"]) .studio-pre .line {
  animation: studio-type var(--t) steps(var(--n), end) var(--at) both;
}

.showcase .studio[data-phase]:not([data-phase="waiting"]) .studio-block {
  animation: studio-block-in 600ms var(--ease-out) var(--at) both;
}

.showcase .studio[data-phase]:not([data-phase="waiting"]) :is(.ca-mark, .ca-arrow) {
  animation: studio-draw 700ms cubic-bezier(0.77, 0, 0.175, 1) var(--at, 0ms) both;
}

.showcase .studio[data-phase]:not([data-phase="waiting"]) .ca-notes li {
  animation: studio-block-in 500ms var(--ease-out) var(--at, 0ms) both;
}

.showcase
  .studio:is([data-phase="waiting"], [data-phase="write"], [data-phase="check"], [data-phase="fix"])
  [data-fixed] {
  visibility: hidden;
  animation: none !important;
}

.showcase
  .studio:is([data-phase="write"], [data-phase="check"], [data-phase="fix"])
  .studio-fix
  del {
  display: inline;
}

.showcase
  .studio:is([data-phase="waiting"], [data-phase="write"], [data-phase="check"])
  .studio-fix
  ins {
  display: none;
}

/* The draft's box, dashed where the agent put it, past the image's edge. */
.showcase .studio[data-phase]:not([data-phase="waiting"]) .studio-ghost {
  display: block;
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--w);
  height: var(--h);
  z-index: 2;
  border: 2px dashed #e5484d;
  border-radius: var(--r-sm);
  background: color-mix(in oklch, #e5484d 10%, transparent);
  animation: studio-block-in 400ms var(--ease-out) var(--at, 0ms) both;
  transition:
    left 700ms cubic-bezier(0.77, 0, 0.175, 1),
    border-color 300ms ease,
    background-color 300ms ease,
    opacity 300ms ease;
}

/* Checking: the plugin's issue, under the line and on the box it names. */
.showcase .studio[data-phase="check"] .studio-fix del {
  text-decoration: wavy underline #e5484d;
  text-decoration-skip-ink: none;
  text-underline-offset: 3px;
}

.showcase .studio[data-phase="check"] .studio-gutter [data-fix] {
  color: #e5484d;
}

.showcase .studio[data-phase="check"] .studio-ghost {
  animation: studio-nudge 600ms ease-in-out 2;
}

/* Fixing: the one value retyped, and the box moved into place. */
.showcase .studio:is([data-phase="fix"], [data-phase="render"]) .studio-fix ins {
  display: inline-block;
  background: color-mix(in oklch, #16a34a 18%, transparent);
  animation:
    studio-type 360ms steps(var(--n), end) both,
    studio-settle 1600ms ease 600ms both;
}

.showcase .studio:is([data-phase="fix"], [data-phase="render"]) .studio-ghost {
  left: var(--to-x);
  border-color: #16a34a;
  background: color-mix(in oklch, #16a34a 10%, transparent);
}

/* Rendering: the fixed mark draws where the box landed, and the box goes. */
.showcase .studio[data-phase="render"] .studio-ghost {
  opacity: 0;
}

.showcase .studio[data-phase="render"] [data-fixed] {
  visibility: visible;
}

.showcase .studio[data-phase="render"] .ca-mark[data-fixed] {
  animation: studio-draw 700ms cubic-bezier(0.77, 0, 0.175, 1) both;
}

.showcase .studio[data-phase="render"] .ca-notes li[data-fixed] {
  animation: studio-block-in 500ms var(--ease-out) 250ms both;
}

@keyframes studio-type {
  from {
    clip-path: inset(0 100% 0 0);
  }
}

@keyframes studio-block-in {
  from {
    opacity: 0;
    translate: 0 8px;
  }
}

/* Wide of the box, since a mark's number and strokes run past it. */
@keyframes studio-draw {
  from {
    clip-path: inset(-150% 100% -150% -150%);
  }

  to {
    clip-path: inset(-150% -150% -150% -150%);
  }
}

@keyframes studio-nudge {
  25% {
    translate: -3px 0;
  }

  75% {
    translate: 3px 0;
  }
}

@keyframes studio-settle {
  to {
    background: transparent;
  }
}

@media (max-width: 60rem) {
  .showcase {
    margin-top: 5rem;
  }

  .showcase .studio-intro,
  .showcase .studio-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .showcase .studio-source {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .showcase .studio-steps li {
    padding-right: 0.375rem;
  }

  .showcase .studio-steps li:not([aria-current]) {
    font-size: 0;
    gap: 0;
  }
}

@media (max-width: 36rem) {
  .showcase .studio-bar {
    grid-template-columns: auto 1fr auto auto;
    padding-left: 0.75rem;
  }

  .showcase .studio-file,
  .showcase .studio-open span,
  .showcase .studio-replay span {
    display: none;
  }

  .showcase .studio-steps {
    justify-self: start;
  }

  .showcase .studio-page {
    padding: 1.25rem;
  }
}
</style>
