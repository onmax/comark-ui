// Every plugin with components for `@comark/svelte`, which leaves out annotate and diff.
import { preset } from "comark-ui";
import { addMermaidStyles } from "comark-ui/client";
import * as badge from "comark-badge/svelte";
import * as cards from "comark-cards/svelte";
import * as carousel from "comark-carousel/svelte";
import * as cast from "comark-cast/svelte";
import * as charts from "comark-charts/svelte";
import * as chips from "comark-chips/svelte";
import * as code from "comark-code/svelte";
import * as codeNotes from "comark-code-notes/svelte";
import * as colors from "comark-colors/svelte";
import * as details from "comark-details/svelte";
import * as diagrams from "comark-diagrams/svelte";
import * as embed from "comark-embed/svelte";
import * as fields from "comark-fields/svelte";
import * as fileTree from "comark-file-tree/svelte";
import * as github from "comark-github/svelte";
import * as icon from "comark-icon/svelte";
import * as links from "comark-links/svelte";
import * as mark from "comark-mark/svelte";
import * as math from "comark-mathml/svelte";
import * as media from "comark-media/svelte";
import pele, { createPeleComponent } from "comark-pele/svelte";
import * as metrics from "comark-metrics/svelte";
import * as outline from "comark-outline/svelte";
import * as properties from "comark-properties/svelte";
import * as qr from "comark-qr/svelte";
import * as sources from "comark-sources/svelte";
import * as steps from "comark-steps/svelte";
import * as table from "comark-table/svelte";
import * as tabs from "comark-tabs/svelte";
import * as tests from "comark-tests/svelte";
import * as zoom from "comark-zoom/svelte";

export { criticCss } from "comark-ui";

// Pele calls `onRender` only in the browser, after it draws, so the styles arrive like the other components' do.
const mermaid = {
  default: pele,
  components: { pele: createPeleComponent({ onRender: addMermaidStyles }) },
};

export default (options) =>
  preset(
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
