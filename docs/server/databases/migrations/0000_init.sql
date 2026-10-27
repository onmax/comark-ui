CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `vitehub_content_sessions` (
	`workspace` text NOT NULL,
	`collection` text NOT NULL,
	`document` text NOT NULL,
	`session` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text,
	`user_image` text,
	`kind` text NOT NULL,
	`acquired_at` integer,
	`renewed_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_input_at` integer,
	PRIMARY KEY(`workspace`, `collection`, `document`, `session`)
);
--> statement-breakpoint
CREATE INDEX `vitehub_content_sessions_expiry` ON `vitehub_content_sessions` (`workspace`,`expires_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`login` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `vitehub_comment_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text DEFAULT 'pages' NOT NULL,
	`number` integer DEFAULT 0 NOT NULL,
	`page` text NOT NULL,
	`anchor` text NOT NULL,
	`context` text,
	`metadata` text,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vitehub_comment_threads_page` ON `vitehub_comment_threads` (`page`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `vitehub_comment_threads_number` ON `vitehub_comment_threads` (`scope`,`number`);--> statement-breakpoint
CREATE INDEX `vitehub_comment_threads_updated` ON `vitehub_comment_threads` (`updated_at`);--> statement-breakpoint
CREATE TABLE `vitehub_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`body` text NOT NULL,
	`mentions` text NOT NULL,
	`author` text NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `vitehub_comment_threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vitehub_comments_thread` ON `vitehub_comments` (`thread_id`,`created_at`);