import type { Component } from "vue";
import * as badge from "comark-badge/vue";
import * as cards from "comark-cards/vue";
import * as carousel from "comark-carousel/vue";
import * as cast from "comark-cast/vue";
import * as charts from "comark-charts/vue";
import * as chips from "comark-chips/vue";
import * as code from "comark-code/vue";
import * as codeNotes from "comark-code-notes/vue";
import * as colors from "comark-colors/vue";
import * as details from "comark-details/vue";
import * as diagrams from "comark-diagrams/vue";
import * as embed from "comark-embed/vue";
import * as fields from "comark-fields/vue";
import * as fileTree from "comark-file-tree/vue";
import * as github from "comark-github/vue";
import * as icon from "comark-icon/vue";
import * as links from "comark-links/vue";
import * as mark from "comark-mark/vue";
import * as math from "comark-mathml/vue";
import * as media from "comark-media/vue";
import pele, { createPeleComponent } from "comark-pele/vue";
import * as metrics from "comark-metrics/vue";
import * as outline from "comark-outline/vue";
import * as properties from "comark-properties/vue";
import * as qr from "comark-qr/vue";
import * as sources from "comark-sources/vue";
import * as steps from "comark-steps/vue";
import * as table from "comark-table/vue";
import * as tabs from "comark-tabs/vue";
import * as tests from "comark-tests/vue";
import * as zoom from "comark-zoom/vue";
import { addMermaidStyles } from "./client.ts";
import { type Preset, type PresetOptions, preset } from "./index.ts";

export { criticCss } from "./index.ts";
export type { PresetOptions } from "./index.ts";

// Pele calls `onRender` only in the browser, after it draws, so the styles arrive like the other components' do.
const mermaid = {
  default: pele,
  components: { pele: createPeleComponent({ onRender: addMermaidStyles }) },
};

/** Every plugin with components for `@comark/vue`, which leaves out annotate and diff. */
export default (options?: PresetOptions): Preset<Component> =>
  preset<Component>(
    {
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
      sources,
      steps,
      table,
      tabs,
      tests,
      zoom,
    },
    options,
  );
