import type { RouterConfig } from "nuxt/schema";
import { START_LOCATION, type RouteLocationNormalized } from "vue-router";

// `html` scrolls smoothly so a link within a page glides to its heading. Nuxt's default leaves the behavior to that
// CSS, so a new page, or one back in history, slid there from wherever the last page was left. They jump instead.
export default {
  scrollBehavior(to, from, savedPosition) {
    if (from === START_LOCATION) return position(to, savedPosition);
    if (to.path === from.path) {
      if (to.hash) return { el: to.hash, top: marginTop(to.hash) };
      return from.hash ? (savedPosition ?? { top: 0 }) : false;
    }
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    // The new page is in once it has loaded; scrolling before would move the old one.
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce("page:loading:end", () => {
        requestAnimationFrame(() =>
          resolve(
            router.currentRoute.value.fullPath === to.fullPath
              ? { ...position(to, savedPosition), behavior: "instant" }
              : false,
          ),
        );
      });
    });
  },
} satisfies RouterConfig;

function position(
  to: RouteLocationNormalized,
  savedPosition: { left: number; top: number } | null,
) {
  if (savedPosition) return savedPosition;
  if (to.hash) return { el: to.hash, top: marginTop(to.hash) };
  return { left: 0, top: 0 };
}

// The router places a heading at the top edge; its scroll margin keeps it clear of the header.
function marginTop(hash: string) {
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!el) return 0;
  return (
    (Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0) +
    (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
  );
}
