import { defineNitroPlugin, useRuntimeConfig } from "nitropack/runtime";

// Only the prerenderer loads this (nuxt.config.ts). It puts on every page the tag that @vite-hub/comments puts there,
// with the loader's hashed URL, so the prerendered files carry it.
export default defineNitroPlugin((nitroApp) => {
  const { commentsLoader } = useRuntimeConfig() as { commentsLoader?: string };
  if (!commentsLoader) return;
  const tag = `<script type="module" src="${commentsLoader.replaceAll("&", "&amp;")}"></script>`;
  nitroApp.hooks.hook("render:html", (html) => void html.bodyAppend.push(tag));
});
