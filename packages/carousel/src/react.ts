import { css as zoomCss, start as startZoom } from "comark-zoom/client";
import { createElement, type ReactNode, useEffect } from "react";
import { css, start } from "./client.ts";

export { default } from "./index.ts";

const off = (value: unknown) => value === false || value === "false";
const chevron = (d: string) =>
  createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("path", { d }),
  );

type CarouselProps = {
  count?: string | number;
  columns?: string | number;
  title?: string;
  zoom?: boolean | string;
  children?: ReactNode;
};

/** `::carousel` for `@comark/react`. */
export function Carousel({ count, columns, title, zoom, children }: CarouselProps) {
  useEffect(() => {
    const stops = [start(css), ...(off(zoom) ? [] : [startZoom(zoomCss)])];
    return () => stops.forEach((stop) => stop());
  }, [zoom]);
  const total = Number(count) || 0;
  const perView = Math.min(3, Math.max(1, Number(columns) || 1));
  const controls =
    total > 1
      ? createElement(
          "div",
          { className: "cc-controls" },
          createElement("span", { className: "cc-count", "aria-live": "polite" }, `1 / ${total}`),
          createElement(
            "div",
            { className: "cc-steps" },
            createElement(
              "button",
              {
                type: "button",
                className: "cc-step",
                "data-carousel-step": "-1",
                "aria-label": "Previous slide",
                "aria-disabled": true,
              },
              chevron("m15 18-6-6 6-6"),
            ),
            createElement(
              "button",
              {
                type: "button",
                className: "cc-step",
                "data-carousel-step": "1",
                "aria-label": "Next slide",
              },
              chevron("m9 18 6-6-6-6"),
            ),
          ),
        )
      : null;
  return createElement(
    "div",
    {
      className: "cc",
      "data-comark-frame": "",
      "data-carousel-columns": perView > 1 ? String(perView) : undefined,
      "data-carousel-fits": total <= perView ? "" : undefined,
      "data-zoom-gallery": off(zoom) ? undefined : "",
      role: "region",
      "aria-roledescription": "carousel",
      "aria-label": title ?? "Carousel",
    },
    createElement("div", { className: "cc-track" }, children),
    controls,
  );
}

type SlideProps = {
  index?: string | number;
  count?: string | number;
  title?: string;
  zoom?: boolean | string;
  children?: ReactNode;
};

/** `:::slide` for `@comark/react`. */
export function Slide({ index, count, title, zoom, children }: SlideProps) {
  const zoomable = !off(zoom);
  return createElement(
    "div",
    {
      className: "cc-slide",
      role: "group",
      "aria-roledescription": "slide",
      "aria-label": `${index} of ${count}`,
      "data-zoom": zoomable ? "" : undefined,
      tabIndex: zoomable ? 0 : undefined,
      "data-zoom-title": zoomable ? title : undefined,
    },
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Carousel, Slide };
