import type { UIMessage } from "ai";
import { render as ssr } from "svelte/server";
import { MessageParts } from "../../src/svelte/index.js";

export const render = (parts: UIMessage["parts"]) => ssr(MessageParts, { props: { parts } }).body;
