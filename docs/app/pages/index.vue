<script setup lang="ts">
// The landing: docs/pages/index.md, its blocks drawn by components/content, across the whole page column. The docs
// page draws the root page as a catalog under a page header even with `layout: landing`, and a landing elsewhere gets
// page actions and the catalog footer, so this page fetches the same document and draws it bare.
import { docsAppPath, docsRawPath } from "#docs/navigation";
import type { DocsPageResponse } from "@vite-hub/docs";

const { site, appBase } = useDocsConfig();

const { data } = await useFetch<DocsPageResponse>(
  docsAppPath("/api/_docs/page/index.json", appBase),
  { key: "docs:/" },
);
if (!data.value)
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
const { page, document } = data.value;

useHead({
  // The landing's title already names the site.
  titleTemplate: "%s",
  link: [
    {
      rel: "alternate",
      type: "text/markdown",
      href: `${site.url}${docsAppPath(docsRawPath(page.path), appBase)}`,
    },
    { rel: "preload", href: "/canvas-cards.json", as: "fetch", crossorigin: "" },
  ],
});
useDocsSeo({
  title: page.seo?.title ?? page.sourceTitle,
  description: page.seo?.description ?? page.description,
  image: page.seo?.image,
  type: "page",
});
</script>

<template>
  <div class="landing" :data-path="page.path">
    <DocsMarkdown :document="document" />
    <footer class="landing-footer">
      <span>Built on <a href="https://comark.dev">Comark</a>.</span>
      <span>Made by <a href="https://onmax.me">Maxi García</a></span>
    </footer>
  </div>
</template>

<style scoped>
/* The landing's blocks share these, in Nuxt UI's colors. The canvas runs nearly edge to edge, so the column holds each
   part of the page rather than the page. */
.landing {
  --column: min(100%, 70rem);
  --bg: var(--ui-bg);
  --fg: var(--ui-text-highlighted);
  --muted: var(--ui-text-muted);
  --faint: var(--ui-text-dimmed);
  --line: var(--ui-border);
  --soft: var(--ui-bg-muted);
  --sans: var(--font-sans);
  --mono: var(--font-mono);
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 16px;
  padding: 0 1rem 4rem;
}

@media (min-width: 40rem) {
  .landing {
    padding-inline: 2rem;
  }
}

.landing-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  width: var(--column);
  margin: 6rem auto 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  color: var(--faint);
  font-size: 0.8125rem;
}

.landing-footer a {
  color: var(--muted);
}

/* comark-ui's typeset styles give every link in the Markdown its parent's color and an underline, a button's label
   too. */
.landing :deep(a[data-slot="base"]) {
  text-decoration: none;
}

.landing :deep(a.text-inverted) {
  color: var(--ui-text-inverted);
}

/* The section headings are a display size here, and aren't links. */
.landing :deep(h2) {
  margin: 0;
  color: var(--fg);
  font-size: clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem);
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.035em;
  text-wrap: balance;
}
</style>
