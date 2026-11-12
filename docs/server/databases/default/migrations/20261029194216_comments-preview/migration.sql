CREATE TABLE `vitehub_comment_forge` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text,
	`repository` text NOT NULL,
	`pull_request` integer NOT NULL,
	`remote_id` text,
	`node_id` text,
	`url` text,
	`digest` text,
	`posted_as` text,
	`minimized` integer DEFAULT false NOT NULL,
	`error` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vitehub_comment_forge_thread` ON `vitehub_comment_forge` (`thread_id`);--> statement-breakpoint
CREATE INDEX `vitehub_comment_forge_pull_request` ON `vitehub_comment_forge` (`repository`,`pull_request`);--> statement-breakpoint
CREATE TABLE `vitehub_comment_scope_counters` (
	`scope` text PRIMARY KEY NOT NULL,
	`last_number` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `vitehub_comment_scope_counters` (`scope`, `last_number`)
SELECT `scope`, max(`number`) FROM `vitehub_comment_threads` GROUP BY `scope`;
