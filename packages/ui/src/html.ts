import type { NodeHandler } from "comark";
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
import * as details from "comark-details/html";
import * as diagrams from "comark-diagrams/html";
import * as diff from "comark-diff/html";
import * as embed from "comark-embed/html";
import * as fields from "comark-fields/html";
import * as fileTree from "comark-file-tree/html";
import * as github from "comark-github/html";
import * as icon from "comark-icon/html";
import * as links from "comark-links/html";
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
import { mermaidCss } from "./client.ts";
import { type Preset, type PresetOptions, preset } from "./index.ts";

export { criticCss } from "./index.ts";
export type { PresetOptions } from "./index.ts";

// Each render gets a fresh `state.context`, so a document carries the styles once.
const styled = new WeakSet<object>();

const mermaid = {
  default: pele,
  components: {
    pele: ((node, state) => {
      const styles = styled.has(state.context)
        ? ""
        : `<style data-comark-mermaid>${mermaidCss}</style>`;
      styled.add(state.context);
      return styles + Pele(node);
    }) satisfies NodeHandler,
  },
};

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
      details,
      diagrams,
      diff,
      embed,
      fields,
      fileTree,
      github,
      icon,
      links,
      mark,
      math,
      media,
      mermaid,
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
      zoom,
    },
    options,
  );
