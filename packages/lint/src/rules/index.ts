import annotate from "./annotate.ts";
import badge from "./badge.ts";
import cards from "./cards.ts";
import carousel from "./carousel.ts";
import cast from "./cast.ts";
import charts from "./charts.ts";
import chips from "./chips.ts";
import code from "./code.ts";
import colors from "./colors.ts";
import comments from "./comments.ts";
import codeNotes from "./code-notes.ts";
import core from "./core.ts";
import details from "./details.ts";
import critic from "./critic.ts";
import diagrams from "./diagrams.ts";
import diff from "./diff.ts";
import embed from "./embed.ts";
import footnotes from "./footnotes.ts";
import fields from "./fields.ts";
import fileTree from "./file-tree.ts";
import github from "./github.ts";
import icon from "./icon.ts";
import include from "./include.ts";
import magicMove from "./magic-move.ts";
import math from "./math.ts";
import mermaid from "./mermaid.ts";
import media from "./media.ts";
import outline from "./outline.ts";
import qr from "./qr.ts";
import quiz from "./quiz.ts";
import properties from "./properties.ts";
import sources from "./sources.ts";
import metrics from "./metrics.ts";
import steps from "./steps.ts";
import table from "./table.ts";
import tabs from "./tabs.ts";
import tests from "./tests.ts";
import type { RuleInfo } from "./types.ts";
import xref from "./xref.ts";

export type { RuleInfo } from "./types.ts";

// The core rules, then each package's, in the order of their codes' hundreds. A new package takes the next hundred.
export const catalog = {
  ...core,
  ...annotate,
  ...cards,
  ...carousel,
  ...charts,
  ...chips,
  ...code,
  ...diff,
  ...embed,
  ...footnotes,
  ...github,
  ...icon,
  ...include,
  ...steps,
  ...tabs,
  ...badge,
  ...outline,
  ...media,
  ...qr,
  ...colors,
  ...diagrams,
  ...cast,
  ...codeNotes,
  ...tests,
  ...fields,
  ...metrics,
  ...fileTree,
  ...details,
  ...critic,
  ...properties,
  ...sources,
  ...table,
  ...xref,
  ...quiz,
  ...math,
  ...magicMove,
  ...comments,
  ...mermaid,
} satisfies Record<string, RuleInfo>;
