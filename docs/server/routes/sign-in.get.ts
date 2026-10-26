import { defineEventHandler, sendRedirect } from "nuxt/server";

// Auth's access rule for /sign-in (server/auth.ts) sends a visitor without a session to GitHub before this runs.
export default defineEventHandler((event) => sendRedirect(event, "/"));
