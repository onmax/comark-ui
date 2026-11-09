import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHtmlRenderer } from "@comark/html";
import { defineComarkPlugin, parseMarkdown } from "comark";
import { describe, expect, it } from "vite-plus/test";
import time, { components, type TimeOptions } from "../src/html.ts";

// 4 November 2026, noon. A fixed clock and zone make every word below the same on any machine.
const settings: TimeOptions = { now: "2026-11-04T12:00:00Z", timeZone: "UTC", locale: "en" };
const render = (markdown: string, options: TimeOptions = settings) =>
  createHtmlRenderer({ plugins: [time({ ...settings, ...options })], components })(markdown);
// ICU separates a time from AM and PM with a narrow no-break space in newer versions.
const flat = (html: string) => html.replaceAll(" ", " ");
const label = async (date: string, props = "", options?: TimeOptions) => {
  const html = flat(await render(`:time[${date}]${props}`, options));
  return html.match(/<time [^>]*>([^<]*)</)?.[1];
};
const tip = async (date: string, props = "", options?: TimeOptions) => {
  const html = flat(await render(`:time[${date}]${props}`, options));
  return html.match(/<span class="ctm-pill">([^<]*)</)?.[1];
};
const issues = async (markdown: string, options: TimeOptions = settings) =>
  (await parseMarkdown(markdown, { plugins: [time(options)] })).meta;

const earlier = defineComarkPlugin(() => ({
  name: "other",
  post(state) {
    state.tree.meta.issues = ["earlier"];
  },
}));

describe("comark-time", () => {
  it("writes a date alone in whole days", async () => {
    expect(await label("2026-11-04")).toBe("today");
    expect(await label("2026-11-03")).toBe("yesterday");
    expect(await label("2026-11-05")).toBe("tomorrow");
    expect(await label("2026-11-02")).toBe("2 days ago");
    expect(await label("2026-11-07")).toBe("in 3 days");
    expect(await label("2026-10-28")).toBe("last week");
    expect(await label("2026-11-25")).toBe("in 3 weeks");
  });

  it("counts a time of day down to the second, rounding toward now", async () => {
    expect(await label("2026-11-04T11:59:56Z")).toBe("4 seconds ago");
    expect(await label("2026-11-04T12:00:04Z")).toBe("in 4 seconds");
    expect(await label("2026-11-04T12:00:00Z")).toBe("now");
    expect(await label("2026-11-04T11:45:00Z")).toBe("15 minutes ago");
    expect(await label("2026-11-04T15:30:00Z")).toBe("in 3 hours");
    expect(await label("2026-11-02T09:00:00Z")).toBe("2 days ago");
    expect(await label("2026-11-01T11:00:00Z")).toBe("3 days ago");
  });

  it("shows a date from the threshold on, with the year only when it isn't this one", async () => {
    expect(await label("2026-10-08")).toBe("3 weeks ago");
    expect(await label("2026-10-07")).toBe("Oct 7");
    expect(await label("2026-12-25")).toBe("Dec 25");
    expect(await label("2025-09-30")).toBe("Sep 30, 2025");
    expect(await label("2026-12-03T09:00:00Z")).toBe("Dec 3");
  });

  it("takes the threshold from the prop, then the option, and `none` keeps it relative", async () => {
    expect(await label("2026-10-20", '{threshold="1w"}')).toBe("Oct 20");
    expect(await label("2026-10-20", '{threshold="8w"}')).toBe("2 weeks ago");
    expect(await label("2026-10-20", "", { threshold: "10d" })).toBe("Oct 20");
    expect(await label("2026-10-20", '{threshold="8w"}', { threshold: "10d" })).toBe("2 weeks ago");
    expect(await label("2023-11-04", '{threshold="none"}')).toBe("3 years ago");
    expect(await label("2026-11-04T11:00:00Z", '{threshold="30m"}')).toBe("Nov 4");
  });

  it("opens the full date when relative, and how far away it is when a date", async () => {
    expect(await tip("2026-11-02")).toBe("Mon, Nov 2, 2026");
    expect(await tip("2026-11-02T09:30:00Z")).toBe("Mon, Nov 2, 2026, 9:30 AM UTC");
    expect(await tip("2026-09-30")).toBe("last month");
    expect(await tip("2026-09-30T14:03:00Z")).toBe("last month · 2:03 PM UTC");
  });

  it("reads a time in the zone, and shows the date in it", async () => {
    const madrid: TimeOptions = { timeZone: "Europe/Madrid" };
    expect(await tip("2026-11-02 09:30", "", madrid)).toBe("Mon, Nov 2, 2026, 9:30 AM GMT+1");
    expect(await tip("2026-11-02T09:30:00Z", "", madrid)).toBe("Mon, Nov 2, 2026, 10:30 AM GMT+1");
    expect(await tip("2026-11-02T09:30:00+02:00", "", madrid)).toBe(
      "Mon, Nov 2, 2026, 8:30 AM GMT+1",
    );
    // 23:30 UTC on the 4th is the 5th in Madrid, so it's tomorrow's date there but not a day away.
    expect(await label("2026-11-05", "", { ...madrid, now: "2026-11-04T23:30:00Z" })).toBe("today");
  });

  it.each(["+24:00", "+99:99", "-01:60", "+0260"])(
    "reports an invalid numeric offset %s and keeps the authored text",
    async (offset) => {
      const date = `2026-11-04T12:00:00${offset}`;
      expect(await render(`:time[${date}]`)).toBe(`<span>${date}</span>`);
      expect(Object.values((await issues(`:time[${date}]`)).issueRules ?? {})).toEqual([
        "comark/time/invalid-date",
      ]);
    },
  );

  it.each([
    ["America/New_York", "2024-03-10T02:30"],
    ["Australia/Lord_Howe", "2024-10-06T02:15"],
  ])("reports nonexistent local times in %s", async (timeZone, date) => {
    const options = { ...settings, timeZone };
    expect(await render(`:time[${date}]`, options)).toBe(`<span>${date}</span>`);
    expect(Object.values((await issues(`:time[${date}]`, options)).issueRules ?? {})).toEqual([
      "comark/time/invalid-date",
    ]);
  });

  it.each([
    ["America/New_York", "2024-11-03T01:30", "2024-11-03T05:30:00Z", "1:30 AM EDT"],
    ["Australia/Lord_Howe", "2024-04-07T01:45", "2024-04-06T14:45:00Z", "1:45 AM GMT+11"],
  ])(
    "chooses the earlier instant for repeated local times in %s",
    async (timeZone, date, iso, clock) => {
      const html = flat(await render(`:time[${date}]`, { timeZone, now: iso }));
      expect(html).toContain(`datetime="${iso}"`);
      expect(html).toContain(clock);
    },
  );

  it("writes the words in the locale", async () => {
    expect(await label("2026-11-03", "", { locale: "es" })).toBe("ayer");
    expect(await label("2026-11-01", "", { locale: "es" })).toBe("hace 3 días");
    expect(await label("2026-12-25", "", { locale: "es" })).toBe("25 dic");
  });

  it("is a time with a tooltip a keyboard reaches, and inlines the styles once", async () => {
    const html = await render("Opened :time[2026-11-02], merged :time[2026-11-04].");
    const first = html.match(/<time [^>]*>/)?.[0] ?? "";
    expect(first).toMatch(/class="ctm" datetime="2026-11-02" data-mode="relative" tabindex="0"/);
    expect(html).toContain('role="tooltip"');
    expect(html.match(/<style data-comark-time>/g)).toHaveLength(1);
    const ids = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    const tips = [...html.matchAll(/<span class="ctm-tip" role="tooltip" id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(tips).toEqual(ids);
  });

  // lightningcss, which Vite minifies CSS with, can't parse `anchored()`, so only the inlined styles flip the pill.
  it("flips the pill below the text in the inlined styles, and keeps style.css readable by Vite", async () => {
    const inline = /<style data-comark-time>(.*?)<\/style>/s.exec(
      await render(":time[2026-11-02]"),
    )?.[1];
    expect(inline).toContain("@container anchored(fallback:--ctm-below)");
    const sheet = readFileSync(
      createRequire(import.meta.url).resolve("comark-time/style.css"),
      "utf8",
    );
    expect(sheet).not.toContain("anchored(");
    expect(sheet).toBe(inline?.replace(/@container anchored\([^{]*\{[^}]*\}\}/, ""));
  });

  it("gives documents on one page different ids", async () => {
    const [one, two] = await Promise.all([
      render(":time[2026-11-02]"),
      render("Hi :time[2026-11-02]"),
    ]);
    expect(one.match(/aria-describedby="([^"]+)"/)?.[1]).not.toBe(
      two.match(/aria-describedby="([^"]+)"/)?.[1],
    );
  });

  it("writes the ISO value of the date and of the instant", async () => {
    expect(await render(":time[2026-11-02]")).toContain('datetime="2026-11-02"');
    expect(await render(":time[2026-11-02T09:30:00.250+02:00]")).toContain(
      'datetime="2026-11-02T07:30:00.250Z"',
    );
  });

  it.each([
    ["2026-11-04T11:59:58.900Z", "2026-11-04T11:59:58.900Z"],
    ["2026-11-04T13:59:58.90+0200", "2026-11-04T11:59:58.900Z"],
    ["2026-11-04T11:59:58.9", "2026-11-04T11:59:58.900Z"],
    ["2026-11-04T11:59:58.001Z", "2026-11-04T11:59:58.001Z"],
  ])("preserves fractional seconds in %s and uses them for the label", async (date, iso) => {
    expect(await render(`:time[${date}]`)).toContain(`datetime="${iso}"`);
    expect(await label(date)).toBe("1 second ago");
  });

  it("reports finer than millisecond precision rather than silently truncating it", async () => {
    const date = "2026-11-04T11:59:58.9001Z";
    expect(await render(`:time[${date}]`)).toBe(`<span>${date}</span>`);
    expect(Object.values((await issues(`:time[${date}]`)).issueRules ?? {})).toEqual([
      "comark/time/invalid-date",
    ]);
  });

  it("renders the same words every time with the same now", async () => {
    expect(await render(":time[2026-11-02] :time[2026-12-25]")).toBe(
      await render(":time[2026-11-02] :time[2026-12-25]"),
    );
  });

  it("measures from the clock when it isn't given a now", async () => {
    const day = new Date().toISOString().slice(0, 10);
    const html = await createHtmlRenderer({ plugins: [time({ locale: "en" })], components })(
      `:time[${day}]`,
    );
    expect(html).toMatch(/<time [^>]*>(today|yesterday|tomorrow)</);
  });

  it("shows text it can't read as written, and reports each problem with its rule", async () => {
    const meta = await issues(
      [
        "Opened :time[next friday], :time[2026-02-31], :time[2026-11-04T25:00:00Z], :time.",
        ":time[2026-11-02]{threshold=soon}",
        ":time[2026-11-02]{format=long}",
      ].join("\n\n"),
    );
    expect(meta.issues).toEqual([
      "`:time` 1: \"next friday\" isn't a date, so it's shown as written. Write it as `2026-10-12` or `2026-10-12T14:03:00Z`.",
      "`:time` 2: \"2026-02-31\" isn't a date, so it's shown as written. Write it as `2026-10-12` or `2026-10-12T14:03:00Z`.",
      "`:time` 3: \"2026-11-04T25:00:00Z\" isn't a date, so it's shown as written. Write it as `2026-10-12` or `2026-10-12T14:03:00Z`.",
      "`:time` 4 has no date. Write the date in brackets, such as `:time[2026-10-12]`.",
      '`:time` 5: `threshold="soon"` isn\'t a duration. Write a number and a unit, such as `threshold="3w"`, or `none` to keep it relative.',
      "`:time` 6: `format` isn't a prop of `:time`, so it's ignored. Use `threshold`.",
    ]);
    expect(Object.values(meta.issueRules ?? {})).toEqual([
      "comark/time/invalid-date",
      "comark/time/invalid-date",
      "comark/time/invalid-date",
      "comark/time/missing-date",
      "comark/time/invalid-threshold",
      "comark/time/unknown-prop",
    ]);
    const html = await render("Opened :time[next friday] and :time.");
    expect(html).toContain("Opened <span>next friday</span> and <span></span>.");
    expect(html).not.toContain("<time");
  });

  it("adds to the issues other plugins reported, and leaves a raw <time> alone", async () => {
    const meta = (
      await parseMarkdown(":time[nope]", {
        plugins: [earlier(), time(settings)],
      })
    ).meta;
    expect(meta.issues?.[0]).toBe("earlier");
    expect(meta.issues).toHaveLength(2);
    expect(await render('<time datetime="2026-11-02">the second</time>')).not.toContain("ctm");
  });

  it("refuses a threshold or zone it can't read when the plugin is created, not mid-document", () => {
    expect(() => time({ threshold: "soon" })).toThrow(/threshold "soon"/);
    expect(() => time({ timeZone: "Mars/Olympus" })).toThrow();
  });

  it.each(["not a date", Number.NaN, Number.POSITIVE_INFINITY, new Date(Number.NaN)])(
    "refuses an invalid now %s when the plugin is created",
    (now) => {
      expect(() => time({ now })).toThrow(/comark-time: now/);
    },
  );

  it("captures a configured Date when the plugin is created", async () => {
    const now = new Date(settings.now!);
    const plugin = time({ ...settings, now });
    now.setTime(Number.NaN);
    const html = await createHtmlRenderer({ plugins: [plugin], components })(":time[2026-11-02]");
    expect(html).toContain(">2 days ago<");
  });
});
