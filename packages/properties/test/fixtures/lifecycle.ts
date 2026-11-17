import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, ref } from "vue";
import { Properties as ReactProperties } from "../../src/react.ts";
import { Properties as VueProperties } from "../../src/vue.ts";
import { relativize } from "../../../time/src/client.ts";

export { relativize };
export function mount(target: HTMLElement, framework: string, populated: boolean) {
  const props = { datetime: "2026-11-02", class: "ctm", tabindex: 0 };
  if (framework === "react") {
    const root = createRoot(target);
    const update = (shown: boolean) =>
      root.render(
        createElement(
          ReactProperties,
          {},
          shown
            ? createElement(
                "time",
                { ...props, dateTime: props.datetime, className: "ctm" },
                "Nov 2, 2026",
                createElement("span", { className: "ctm-pill" }, "tip"),
              )
            : null,
        ),
      );
    update(populated);
    return update;
  }
  const shown = ref(populated);
  createApp({
    render: () =>
      h(
        VueProperties,
        {},
        {
          default: () =>
            shown.value
              ? [h("time", props, ["Nov 2, 2026", h("span", { class: "ctm-pill" }, "tip")])]
              : [],
        },
      ),
  }).mount(target);
  return (value: boolean) => {
    shown.value = value;
  };
}
