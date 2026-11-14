import { escapeHtml } from "comark/utils";
import { rawText } from "./text.ts";

/** A value as the inside of a double-quoted HTML attribute. */
export const attr = (value: unknown): string => escapeHtml(rawText(value), { '"': "&quot;" });

/** Keep script bodies invariant when Comark indents their native HTML ancestors.
 * U+2028 is a JavaScript line terminator, but HTML formatting only indents LF lines.
 * Unlike joining lines, this preserves line comments and automatic semicolon insertion.
 */
export const inlineScript = (source: string): string => source.replace(/\r\n?|\n/g, "\u2028");
