import type { NodeHandler } from "comark";
import { escapeHtml } from "comark/utils";
import * as annotate from "comark-annotate/html";
import * as badge from "comark-badge/html";
import * as cards from "comark-cards/html";
import * as carousel from "comark-carousel/html";
import * as cast from "comark-cast/html";
import * as charts from "comark-charts/html";
import * as chips from "comark-chips/html";
import * as code from "comark-code/html";
import * as codeNotes from "comark-code-notes/html";
import * as colors from "comark-colors/html";
import * as comments from "comark-comments/html";
import * as details from "comark-details/html";
import * as diagrams from "comark-diagrams/html";
import * as diff from "comark-diff/html";
import * as embed from "comark-embed/html";
import * as fields from "comark-fields/html";
import * as fileTree from "comark-file-tree/html";
import * as github from "comark-github/html";
import * as icon from "comark-icon/html";
import * as links from "comark-links/html";
import * as magicMove from "comark-magic-move/html";
import * as mark from "comark-mark/html";
import * as math from "comark-mathml/html";
import * as media from "comark-media/html";
import pele, { Pele } from "comark-pele/html";
import * as metrics from "comark-metrics/html";
import * as outline from "comark-outline/html";
import * as properties from "comark-properties/html";
import * as qr from "comark-qr/html";
import * as quiz from "comark-quiz/html";
import * as sources from "comark-sources/html";
import * as steps from "comark-steps/html";
import * as table from "comark-table/html";
import * as tabs from "comark-tabs/html";
import * as tests from "comark-tests/html";
import * as zoom from "comark-zoom/html";
import { mermaidBar, mermaidCss } from "./client.ts";
import { type Preset, type PresetOptions, preset } from "./index.ts";
import { start } from "./script.ts";
import { typesetCss } from "./typeset-css.ts";

export { criticCss } from "./index.ts";
export type { PresetOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles and the script once.
const styled = new WeakSet<object>();

/**
 * The text of the inline `<script>` that runs the Mermaid diagrams' Copy image and Copy source buttons. It's the same on
 * every render and changes only between versions, so a page with a strict Content Security Policy can allow it by its
 * hash without rendering a document first.
 */
export const mermaidScript = `(${start.toString()})()`;

const attr = (value: string) => escapeHtml(value, { '"': "&quot;" });

/**
 * Wraps Pele's card in `.cmm` with the bar of buttons and the source they copy. The wrapper is a wide block with the
 * diagram's own width, so a page that gives wide blocks room shows a long flowchart at its size rather than shrinking
 * its labels to fit the column. A drawn diagram zooms with comark-zoom unless the preset turns zoom off.
 */
const mermaid = (zooms: boolean) => ({
  default: pele,
  components: {
    pele: ((node, state) => {
      const first = !styled.has(state.context);
      styled.add(state.context);
      const card = Pele(node);
      // SAFETY: comark-pele writes the fence's text on every node as `content`.
      const source = node[1].content as string;
      const width = /^<div[^>]*><svg[^>]* width="([\d.]+)"/.exec(card)?.[1];
      const wide = width ? ` data-wide style="--cmm-svg:${Math.ceil(Number(width))}px"` : "";
      // Pele writes the card as one `div`, its SVG first when it drew one.
      const zoomed = zooms && width ? card.replace(/^<div/, '<div data-zoom tabindex="0"') : card;
      return (
        (first ? `<style data-comark-mermaid>${mermaidCss}</style>` : "") +
        `<div class="cmm"${wide} data-source="${attr(source)}">${zoomed}<div class="cmm-bar">${mermaidBar()}</div>` +
        `${first ? `<script>${mermaidScript}</script>` : ""}${zooms && width ? zoom.runtime(state) : ""}</div>`
      );
    }) satisfies NodeHandler,
  },
});

// In the document itself, so `@scope` styles the element it renders into.
const typeset: NodeHandler = () => `<style data-comark-typeset>${typesetCss}</style>`;

/** Every plugin for `@comark/html`, with the `components` to render them. */
export default (options?: PresetOptions): Preset<NodeHandler> =>
  preset<NodeHandler>(
    {
      annotate,
      badge,
      cards,
      carousel,
      cast,
      charts,
      chips,
      code,
      codeNotes,
      colors,
      comments,
      details,
      diagrams,
      diff,
      embed,
      fields,
      fileTree,
      github,
      icon,
      links,
      magicMove,
      mark,
      math,
      media,
      mermaid: mermaid(options?.zoom !== false),
      metrics,
      outline,
      properties,
      qr,
      quiz,
      sources,
      steps,
      table,
      tabs,
      tests,
      typeset,
      zoom,
    },
    options,
  );
