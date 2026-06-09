ALTER TABLE "user_settings" ADD COLUMN "location_resolved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "resolved_location" text;