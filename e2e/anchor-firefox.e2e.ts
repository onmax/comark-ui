import { test } from "@playwright/test";
import { anchoredPopovers } from "./anchor.ts";

test.use({ browserName: "firefox" });
anchoredPopovers();
