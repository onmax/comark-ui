import { Icon, type IconData } from "comark-icon/react";
import { createContext, createElement, type ReactNode, useContext, useEffect, useId } from "react";
import { css, start } from "./client.ts";

export { default } from "./index.ts";

const icon = (value?: IconData | null) => (value?.src ? createElement(Icon, value) : null);

const TabsId = createContext("");

type TabsProps = {
  labels?: string[];
  icons?: (IconData | null)[];
  sync?: string;
  code?: string | boolean;
  magic?: string;
  children?: ReactNode;
};

/** `::tabs` and `::code-group` for `@comark/react`. */
export function Tabs({ labels = [], icons = [], sync, code, magic, children }: TabsProps) {
  const id = useId();
  useEffect(() => {
    return start(css);
  }, []);
  return createElement(
    TabsId.Provider,
    { value: id },
    createElement(
      "div",
      {
        className: "ct",
        "data-tabs-code": code ? "" : undefined,
        "data-code-header": code ? "" : undefined,
        "data-tabs-magic": code ? magic : undefined,
        "data-tabs-sync": sync || undefined,
      },
      createElement(
        "div",
        { className: "ct-list", role: "tablist" },
        labels.map((label, at) =>
          createElement(
            "button",
            {
              key: at,
              type: "button",
              className: "ct-tab",
              role: "tab",
              id: `${id}-tab-${at + 1}`,
              "aria-controls": `${id}-panel-${at + 1}`,
              "aria-selected": at === 0,
              tabIndex: at === 0 ? 0 : -1,
            },
            icon(icons[at]),
            label,
          ),
        ),
      ),
      children,
    ),
  );
}

type TabsItemProps = {
  label?: string;
  icon?: IconData;
  index?: string | number;
  children?: ReactNode;
};

/** `:::tabs-item` for `@comark/react`. */
export function TabsItem({ label, icon: tabIcon, index, children }: TabsItemProps) {
  const id = useContext(TabsId);
  const at = Number(index) || 1;
  return createElement(
    "div",
    {
      className: "ct-panel",
      role: "tabpanel",
      id: `${id}-panel-${at}`,
      "aria-labelledby": `${id}-tab-${at}`,
      tabIndex: 0,
      "data-inactive": at > 1 ? "" : undefined,
    },
    createElement("div", { className: "ct-caption" }, icon(tabIcon), label),
    children,
  );
}

/** Pass these as `components` to `@comark/react`. */
export const components = { Tabs, TabsItem };
