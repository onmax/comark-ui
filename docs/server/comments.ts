import { defineComments } from "vite-hub/comments";

// Figma-style comments on the docs pages, for the team only. The Console decides who that is (console-authorize.ts):
// opening /_vitehub turns comment mode on for them, and every other visitor gets the prerendered files unchanged.
export const comments = defineComments();
