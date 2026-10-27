import { describe, expect, it, vi } from "vite-plus/test";
import comarkUi from "../src/html.ts";
import { browserPlugins } from "../../../docs/plugins.ts";

vi.mock("../src/html.ts", () => ({
  default: vi.fn(() => ({ plugins: [], components: {} })),
}));

describe("browser download policy", () => {
  it.each([false, true])("forwards download=%s to badges and chips", (download) => {
    browserPlugins({}, { download });
    expect(comarkUi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        badge: { download },
        chips: expect.objectContaining({ download }),
      }),
    );
  });
  it("enables downloads by default for static pages", () => {
    browserPlugins();
    expect(comarkUi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        badge: { download: true },
        chips: expect.objectContaining({ download: true }),
      }),
    );
  });
});
