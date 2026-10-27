import { createError, defineEventHandler, getRequestURL } from "nuxt/server";

// The site reads its published pages from the files built into it, and the editor goes through the Console, so nothing
// here reads /api/content. Closed, an anonymous visitor can't spend the GitHub token's rate limit on it.
export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname.startsWith("/api/content"))
    throw createError({ status: 404, message: "Not found." });
});
