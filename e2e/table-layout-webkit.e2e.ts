import { test } from "@playwright/test";
import { tableLayouts } from "./table-layout.ts";

test.use({ browserName: "webkit" });
tableLayouts();
