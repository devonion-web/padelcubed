CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"linkedin_sub" text,
	"consent_events_at" timestamp with time zone,
	"consent_marketing_at" timestamp with time zone,
	"consent_sponsor_at" timestamp with time zone,
	"opted_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_linkedin_sub_unique" UNIQUE("linkedin_sub")
);
--> statement-breakpoint
CREATE TABLE "webhook_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"job_title" text,
	"industry" text,
	"function" text,
	"seniority" text,
	"padel_level" text,
	"interests" text[],
	"linkedin_url" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"consent_events_at" timestamp with time zone,
	"consent_marketing_at" timestamp with time zone,
	"consent_sponsor_at" timestamp with time zone,
	"gdpr_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "corporate_enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"contact_name" text NOT NULL,
	"work_email" text NOT NULL,
	"phone" text,
	"event_type" text NOT NULL,
	"headcount" integer,
	"timeframe" text,
	"budget_range" text,
	"message" text,
	"gdpr_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"date_short" text NOT NULL,
	"time" text NOT NULL,
	"venue" text NOT NULL,
	"location" text NOT NULL,
	"format" text DEFAULT 'Americano' NOT NULL,
	"sponsor" text,
	"price" text DEFAULT 'Free' NOT NULL,
	"price_pence" integer DEFAULT 0 NOT NULL,
	"stripe_price_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"description" text,
	"max_spots" integer DEFAULT 16,
	"courts_count" integer DEFAULT 3,
	"round_duration_minutes" integer DEFAULT 15,
	"total_event_minutes" integer DEFAULT 120,
	"event_date" timestamp with time zone,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"event_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"company" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"payment_status" text DEFAULT 'free' NOT NULL,
	"stripe_session_id" text,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_at" timestamp with time zone,
	CONSTRAINT "bookings_event_email_uniq" UNIQUE("event_id","email")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "americano_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"format" text DEFAULT 'americano' NOT NULL,
	"courts_count" integer DEFAULT 3 NOT NULL,
	"round_duration_minutes" integer DEFAULT 15 NOT NULL,
	"total_event_minutes" integer DEFAULT 120 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "americano_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"booking_id" integer,
	"walkin_id" integer,
	"total_points" integer DEFAULT 0 NOT NULL,
	"rounds_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"eliminated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "americano_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "americano_courts" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"court_number" integer NOT NULL,
	"player1_id" integer NOT NULL,
	"player2_id" integer NOT NULL,
	"player3_id" integer NOT NULL,
	"player4_id" integer NOT NULL,
	"team_a_score" integer,
	"team_b_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_players" ADD CONSTRAINT "americano_players_session_id_americano_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."americano_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_rounds" ADD CONSTRAINT "americano_rounds_session_id_americano_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."americano_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_courts" ADD CONSTRAINT "americano_courts_round_id_americano_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."americano_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_courts" ADD CONSTRAINT "americano_courts_player1_id_americano_players_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."americano_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_courts" ADD CONSTRAINT "americano_courts_player2_id_americano_players_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."americano_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_courts" ADD CONSTRAINT "americano_courts_player3_id_americano_players_id_fk" FOREIGN KEY ("player3_id") REFERENCES "public"."americano_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "americano_courts" ADD CONSTRAINT "americano_courts_player4_id_americano_players_id_fk" FOREIGN KEY ("player4_id") REFERENCES "public"."americano_players"("id") ON DELETE no action ON UPDATE no action;