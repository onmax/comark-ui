// @vitest-environment happy-dom
import { MarkdownDocument } from "@comark/vue";
import { parseMarkdown } from "comark";
import { expect, it, vi } from "vite-plus/test";
import { createApp, h, ref, Suspense } from "vue";
import tabs from "../../tabs/src/index.ts";
import { components } from "../src/vue-lazy.ts";

it("restores both the saved header and panels on first-use lazy navigation", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  localStorage.setItem("comark-tabs:review-lazy", "Second");
  const value = ref(await parseMarkdown("Plain document."));
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(Suspense, null, {
        default: () => h(MarkdownDocument, { value: value.value, components }),
      }),
  });
  try {
    app.mount(host);
    await vi.waitFor(() => expect(host.textContent).toContain("Plain document."));
    value.value = await parseMarkdown(
      `::tabs{sync="review-lazy"}
:::tabs-item{label="First"}
First body.
:::
:::tabs-item{label="Second"}
Second body.
:::
::`,
      { plugins: [tabs()] },
    );
    await vi.waitFor(() => {
      const panels = host.querySelectorAll(".ct-panel");
      expect(panels).toHaveLength(2);
      expect(host.querySelector('[aria-selected="true"]')?.textContent).toBe("Second");
      expect(panels[0]?.hasAttribute("data-inactive")).toBe(true);
      expect(panels[1]?.hasAttribute("data-inactive")).toBe(false);
    });
  } finally {
    app.unmount();
    host.remove();
    localStorage.removeItem("comark-tabs:review-lazy");
    vi.unstubAllGlobals();
  }
});
