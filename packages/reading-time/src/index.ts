import type { Node } from "comark";
import { defineComarkPlugin } from "comark";

export interface ReadingTimeOptions {
  /** How many words a reader reads a minute. Default 200. */
  wordsPerMinute?: number;
}

export interface ReadingTime {
  /** The words in the document's text, outside code blocks. Each CJK character counts as one. */
  words: number;
  /** `words` over the reading speed, rounded up. 0 for a document with no words. */
  minutes: number;
}

export type ReadingTimeMeta = { readingTime: ReadingTime };

// Chinese, Japanese, and Korean are written without spaces between words, so each character counts as one.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const WORD = /[\p{L}\p{N}]/u;
const RAW_CODE = new Set(["pre", "script", "style", "textarea"]);

/** The text of every node but code blocks, with a space between nodes so words in adjacent blocks stay apart. */
function textOf(nodes: Node[], parts: string[] = []) {
  for (const node of nodes) {
    if (!Array.isArray(node)) parts.push(node);
    else if (node[0] !== null && !RAW_CODE.has(node[0].toLowerCase())) {
      const [, , ...children] = node;
      textOf(children, parts);
    }
  }
  return parts;
}

/** Counts the words in a text: each CJK character, plus each run of other letters and digits between spaces. */
export function countWords(text: string) {
  const cjk = text.match(CJK)?.length ?? 0;
  const rest = text
    .replace(CJK, " ")
    .split(/\s+/)
    .filter((word) => WORD.test(word)).length;
  return cjk + rest;
}

/** Writes how long a document takes to read to `meta.readingTime`, as `{ words, minutes }`, leaving code blocks out. */
export default defineComarkPlugin<ReadingTimeOptions, ReadingTimeMeta>((options = {}) => ({
  name: "comark-reading-time",
  post(state) {
    const speed = options.wordsPerMinute ?? 200;
    const words = countWords(textOf(state.tree.nodes).join(" "));
    state.tree.meta.readingTime = { words, minutes: Math.ceil(words / (speed > 0 ? speed : 200)) };
  },
}));
