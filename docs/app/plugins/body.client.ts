import { bodyKey, docsPath, slugFromPath, slugOf } from "~/utils/body";

// `<PageBody>` asks for its island JSON only once the next page's setup runs, after `_payload.json` has arrived, so a
// navigation waited for two requests in a row. The body is fetched here instead: when a pointer rests on a link, on
// focus or touch, and at the latest as the navigation starts, alongside the payload. NuxtLink prefetches payloads
// when links scroll into view; bodies are bigger, so they wait for intent.
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  const data = nuxtApp.payload.data as Record<string, unknown>;

  function loadBody(slug: string, priority: RequestPriority = "low"): Promise<unknown> {
    const key = bodyKey(slug);
    if (data[key]) return Promise.resolve(data[key]);
    const pending = fetch(`/__nuxt_island/${key}.json`, { priority })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} for the body of /${slug}`);
        return response.json() as Promise<unknown>;
      })
      .then(
        (island) => (data[key] = island),
        (error: unknown) => {
          delete data[key];
          throw error;
        },
      );
    data[key] = pending;
    return pending;
  }

  function prefetch(target: EventTarget | null) {
    const link = target instanceof Element ? target.closest("a") : null;
    const path = link && docsPath(link);
    if (!path || path === router.currentRoute.value.path) return;
    loadBody(slugFromPath(path)).catch(() => {});
    // Links in the rendered Markdown aren't NuxtLinks, so nothing else prefetches their payload.
    void nuxtApp.callHook("link:prefetch", path);
  }

  // A pointer passing over the header on its way somewhere else isn't intent; one that stays 65 ms is.
  let resting: ReturnType<typeof setTimeout> | undefined;
  document.addEventListener("pointerover", (event) => {
    clearTimeout(resting);
    if (event.pointerType === "mouse") resting = setTimeout(prefetch, 65, event.target);
  });
  document.addEventListener("pointerout", () => clearTimeout(resting));
  for (const type of ["pointerdown", "focusin", "touchstart"])
    document.addEventListener(type, (event) => prefetch(event.target), { passive: true });

  router.beforeEach((to, from) => {
    if (to.path !== from.path && !nuxtApp.isHydrating) loadBody(slugOf(to), "high").catch(() => {});
  });

  return { provide: { loadBody } };
});
