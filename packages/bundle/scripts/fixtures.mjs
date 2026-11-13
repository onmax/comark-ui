// Writes the test and docs fixtures: made-up builds, deterministic, so a rerun changes nothing.
//   test/fixtures/vite/{before,after}: a Vite build with sourcemaps, the entry named by index.html.
//   test/fixtures/nuxt/{before,after}: a Nuxt client build without sourcemaps, its default layout loaded by import().
//   test/fixtures/sonda/{main,pr}.json: Sonda reports of a dashboard that upgrades ECharts, for the docs.
// Run with `node scripts/fixtures.mjs` from the package.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const out = new URL("../test/fixtures/", import.meta.url).pathname;
const write = (path, text) => {
  mkdirSync(dirname(out + path), { recursive: true });
  writeFileSync(out + path, text);
};

// Code that compresses like minified JavaScript, about 3:1, the same for the same seed.
function code(seed, full) {
  const bytes = Math.round(full / 5);
  let state = [...seed].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 7);
  const next = () => (state = (state * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const words = ["get", "set", "has", "map", "push", "emit", "watch", "patch", "mount", "track"];
  let text = "";
  while (text.length < bytes) {
    const name = String.fromCharCode(97 + Math.floor(next() * 26)) + Math.floor(next() * 900);
    text += `${name}=${words[Math.floor(next() * words.length)]}(${Math.floor(next() * 1e4)},"${seed.slice(0, 6)}${Math.floor(next() * 99)}");`;
    if (next() < 0.08) text += "\n";
  }
  return text;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const vlq = (n) => {
  let v = n < 0 ? (-n << 1) | 1 : n << 1;
  let s = "";
  do {
    let digit = v & 31;
    v >>>= 5;
    if (v) digit |= 32;
    s += B64[digit];
  } while (v);
  return s;
};

// A chunk from its modules: [source path, bytes]. Every line starts a segment for the module it belongs to.
function chunk(name, head, modules) {
  let text = head;
  const lines = [];
  for (const [index, [source, bytes]] of modules.entries())
    for (const line of code(source, bytes).split("\n")) lines.push([index, line]);
  const sources = modules.map(([source]) => source);
  let previous = 0;
  const first = text.split("\n").length - 1;
  const mappings = [...Array(first).fill("")];
  const body = lines.map(([index, line]) => {
    mappings.push(vlq(0) + vlq(index - previous) + vlq(0) + vlq(0));
    previous = index;
    return line;
  });
  text += body.join("\n");
  return {
    text: `${text}\n//# sourceMappingURL=${name.split("/").pop()}.map\n`,
    map: JSON.stringify({ version: 3, sources, names: [], mappings: mappings.join(";") }),
  };
}

function vite(dir, chunks, entry) {
  rmSync(out + dir, { recursive: true, force: true });
  write(
    `${dir}/index.html`,
    `<!doctype html><script type="module" crossorigin src="/assets/${entry}"></script><div id="app"></div>\n`,
  );
  for (const [name, head, modules] of chunks) {
    const { text, map } = chunk(name, head, modules);
    write(`${dir}/assets/${name}`, text);
    write(`${dir}/assets/${name}.map`, map);
  }
}

const nm = (pkg, file = "index.js") => `../node_modules/${pkg}/${file}`;

vite(
  "vite/before",
  [
    [
      "index-B1xQ.js",
      'import"./vendor-vue-Dk2a.js";const Chart=()=>import("./Chart-Cc1k.js");\n',
      [
        ["../src/main.ts", 9000],
        [nm("lodash", "lodash.js"), 24000],
        [nm("date-fns", "index.mjs"), 12000],
      ],
    ],
    [
      "vendor-vue-Dk2a.js",
      "\n",
      [[nm("@vue/runtime-core", "dist/runtime-core.esm-bundler.js"), 30000]],
    ],
    [
      "Chart-Cc1k.js",
      'import"./vendor-vue-Dk2a.js";\n',
      [
        ["../src/Chart.vue", 2000],
        [nm("echarts", "lib/echarts.js"), 60000],
        [nm("zrender", "lib/zrender.js"), 20000],
      ],
    ],
  ],
  "index-B1xQ.js",
);

vite(
  "vite/after",
  [
    [
      "index-Q9zR.js",
      'import"./vendor-vue-Dk2a.js";import{init}from"./vendor-charts-D8kz.js";const Billing=()=>import("./billing-CqX9.js");\n',
      [
        ["../src/main.ts", 9500],
        [nm("date-fns", "index.mjs"), 12000],
      ],
    ],
    [
      "vendor-vue-Dk2a.js",
      "\n",
      [[nm("@vue/runtime-core", "dist/runtime-core.esm-bundler.js"), 30000]],
    ],
    [
      "vendor-charts-D8kz.js",
      "\n",
      [
        [nm("echarts", "lib/echarts.js"), 63000],
        [nm("zrender", "lib/zrender.js"), 20000],
      ],
    ],
    [
      "billing-CqX9.js",
      'import"./vendor-vue-Dk2a.js";\n',
      [
        ["../src/Billing.vue", 1500],
        [nm("billing/node_modules/date-fns", "index.mjs"), 5000],
        [nm("lodash-es", "debounce.js"), 2500],
      ],
    ],
  ],
  "index-Q9zR.js",
);

// Nuxt's client: no sourcemaps, the entry holds `#__nuxt` and a layouts map whose default layout loads by import().
function nuxt(dir, moment) {
  rmSync(out + dir, { recursive: true, force: true });
  const entry = `import"./vue-C3d4.js";const layouts={default:Jt(()=>I(()=>import(\`./default-E5f6.js\`),[]))};const routes=[{component:()=>I(()=>import(\`./index-J9k0.js\`),[])}];mount("#__nuxt");\n${code("nuxt-entry", 30000)}\n`;
  write(`${dir}/entry-A1b2.js`, entry);
  write(`${dir}/vue-C3d4.js`, code("vue", 25000));
  write(
    `${dir}/default-E5f6.js`,
    `${moment ? 'import"./moment-G7h8.js";' : ""}\n${code("layout", 8000)}`,
  );
  if (moment) write(`${dir}/moment-G7h8.js`, code("moment", 50000));
  write(
    `${dir}/index-J9k0.js`,
    `${moment ? "" : "const T=()=>import(`./polyfill-L1m2.js`);"}\n${code("page", 12000)}`,
  );
  if (!moment) write(`${dir}/polyfill-L1m2.js`, code("polyfill", 45000));
}
nuxt("nuxt/before", true);
nuxt("nuxt/after", false);

// Sonda reports at a real dashboard's scale. Sizes are in bytes: [raw, gzip, brotli] per module per asset.
function sonda(assets, connections) {
  const resources = [];
  const s = (gzip) => ({
    uncompressed: Math.round(gzip * 3.1),
    gzip,
    brotli: Math.round(gzip * 0.87),
  });
  for (const [asset, modules] of Object.entries(assets)) {
    const total = modules.reduce((sum, [, gzip]) => sum + gzip, 0);
    resources.push({ kind: "asset", name: `dist/assets/${asset}`, type: "script", ...s(total) });
    for (const [module, gzip] of modules)
      resources.push({
        kind: "chunk",
        name: module,
        type: "script",
        format: "esm",
        ...s(gzip),
        parent: `dist/assets/${asset}`,
      });
  }
  const json = {
    metadata: {
      version: "0.14.0",
      generatedAt: "2026-11-13T12:00:00.000Z",
      integration: "vite",
      sources: false,
      gzip: true,
      brotli: true,
    },
    resources,
    connections: connections.map(([kind, source, target]) => ({
      kind,
      source,
      target,
      original: null,
    })),
    dependencies: [],
    issues: [],
  };
  return `${JSON.stringify(json, null, 1)}\n`;
}
const app = (file) => `src/${file}`;
const pk = (pkg, file = "index.js") => `node_modules/${pkg}/${file}`;
const main = {
  "index-B1xQ.js": [
    [app("main.ts"), 158800],
    [pk("lodash", "lodash.js"), 24600],
    [pk("date-fns", "index.mjs"), 17900],
    [pk("@floating-ui/dom", "dist/floating-ui.dom.mjs"), 5100],
    [pk("vue", "dist/vue.runtime.esm-bundler.js"), 44900],
  ],
  "Chart-Cc1k.js": [
    [app("components/Chart.vue"), 1900],
    [pk("echarts", "lib/echarts.js"), 98200],
    [pk("zrender", "lib/zrender.js"), 47300],
  ],
  "DatePicker-Hn2.js": [
    [app("components/DatePicker.vue"), 3400],
    [pk("@internationalized/date", "dist/import.mjs"), 7800],
  ],
  "settings-Bq1.js": [[app("pages/settings.vue"), 254200]],
};
const pr = {
  "index-Q9zR.js": [
    [app("main.ts"), 160200],
    [pk("date-fns", "index.mjs"), 17900],
    [pk("@floating-ui/dom", "dist/floating-ui.dom.mjs"), 5400],
    [pk("vue", "dist/vue.runtime.esm-bundler.js"), 44900],
  ],
  "vendor-charts-D8kz.js": [
    [pk("echarts", "lib/echarts.js"), 102700],
    [pk("zrender", "lib/zrender.js"), 48000],
  ],
  "DatePicker-Hn2.js": [
    [app("components/DatePicker.vue"), 3400],
    [pk("@internationalized/date", "dist/import.mjs"), 7800],
  ],
  "settings-Bq1.js": [
    [app("pages/settings.vue"), 247500],
    [pk("lodash-es", "debounce.js"), 3100],
  ],
  "billing-CqX9.js": [
    [app("pages/settings/billing.vue"), 2500],
    [pk("billing/node_modules/date-fns", "index.mjs"), 6200],
  ],
};
write(
  "sonda/main.json",
  sonda(main, [
    ["entrypoint", "dist/assets/index-B1xQ.js", app("main.ts")],
    ["dynamic-import", app("main.ts"), app("components/Chart.vue")],
    ["import", app("components/Chart.vue"), pk("echarts", "lib/echarts.js")],
    ["dynamic-import", app("main.ts"), app("components/DatePicker.vue")],
    ["dynamic-import", app("main.ts"), app("pages/settings.vue")],
  ]),
);
write(
  "sonda/pr.json",
  sonda(pr, [
    ["entrypoint", "dist/assets/index-Q9zR.js", app("main.ts")],
    ["import", app("main.ts"), pk("echarts", "lib/echarts.js")],
    ["dynamic-import", app("main.ts"), app("components/DatePicker.vue")],
    ["dynamic-import", app("main.ts"), app("pages/settings.vue")],
    ["dynamic-import", app("pages/settings.vue"), app("pages/settings/billing.vue")],
  ]),
);
console.log("written", out);
