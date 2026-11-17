import { test } from "@playwright/test";
import { dialogTests } from "./zoom-dialog.ts";

test.use({ browserName: "firefox" });

dialogTests();
