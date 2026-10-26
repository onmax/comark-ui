import { defineEventHandler, getRequestURL } from "nuxt/server";
import { createBadgeHandler } from "../../../packages/badge/src/server.ts";

const badge = createBadgeHandler();

export default defineEventHandler((event) =>
  badge(new Request(getRequestURL(event), { method: event.req.method })),
);
