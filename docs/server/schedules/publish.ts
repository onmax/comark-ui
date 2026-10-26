import { defineSchedule } from "vite-hub/schedule";
import { content } from "../content.ts";

// The Console's editor can schedule a publish; nothing publishes it until this runs. Content calls a schedule overdue
// after five minutes without a run, so it runs every minute.
export default defineSchedule({ cron: "* * * * *", handler: () => content.publishDue() });
