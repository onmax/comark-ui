<script setup lang="ts">
import { docsPath, slugOf } from "~/utils/body";
import { runScripts } from "~/utils/scripts";

const site = "https://comark-ui.onmax.me";
const route = useRoute();
const slug = computed(() => slugOf(route));
const nuxtApp = useNuxtApp();
const hydrating = nuxtApp.isHydrating;
const [{ data: page }] = await Promise.all([
  useFetch(() => `/api/pages/${slug.value || "index"}`, {
    key: () => `page:${slug.value}`,
    query: { body: 0 },
  }),
  // The body the navigation started fetching, so <PageBody> finds it instead of asking again. If it failed,
  // <PageBody> asks itself and reports the error.
  import.meta.client && !hydrating ? nuxtApp.$loadBody(slug.value).catch(() => {}) : undefined,
]);
if (!page.value) throw createError({ status: 404, message: `No page at /${slug.value}.` });

const url = `${site}/${slug.value ? `${slug.value}/` : ""}`;
useHead(() => ({
  title: page.value!.title,
  meta: [
    { name: "description", content: page.value!.description },
    { property: "og:title", content: page.value!.title },
    { property: "og:description", content: page.value!.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "comark ui" },
    { property: "og:image", content: `${site}/og/home.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Review documents, written in Markdown: comark ui",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: `${site}/og/home.png` },
  ],
  link: [{ rel: "canonical", href: url }],
  style: [{ key: "icons", innerHTML: page.value!.css }],
}));

// The body's scripts run once its HTML is in. On a first load the browser already ran them.
const root = useTemplateRef<HTMLElement>("root");
let stop: (() => void) | undefined;
onMounted(() => (stop = runScripts(root.value!, !hydrating)));
onBeforeUnmount(() => stop?.());

// Links in the generated HTML are plain anchors; same-site ones navigate in the app.
const router = useRouter();
function follow(event: MouseEvent) {
  const link = (event.target as Element).closest("a");
  if (
    !link ||
    event.defaultPrevented ||
    event.button ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey
  )
    return;
  const path = docsPath(link);
  if (!path) return;
  const url = new URL(link.href, location.href);
  if (path === location.pathname && url.hash) return;
  event.preventDefault();
  void router.push(path + url.search + url.hash);
}
</script>

<template>
  <!-- The body is a server island, which Vue doesn't hydrate, so its scripts can change it from the start. -->
  <div v-if="page" ref="root" class="app" @click="follow">
    <PageBody :slug="slug" />
  </div>
</template>
