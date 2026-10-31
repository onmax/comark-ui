import { escapeHtml } from "comark/utils";
import { rawText } from "./text.ts";

/** A value as the inside of a double-quoted HTML attribute. */
export const attr = (value: unknown): string => escapeHtml(rawText(value), { '"': "&quot;" });
