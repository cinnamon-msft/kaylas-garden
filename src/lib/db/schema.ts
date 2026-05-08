import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Auth tables (NextAuth compatible) ───────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  username: text("username").unique(),
  location: text("location"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

// ─── App tables ──────────────────────────────────────────────────────────────

export const plants = pgTable("plants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nickname: text("nickname"),
  species: text("species").notNull().default(""),
  dateAdded: timestamp("date_added", { mode: "date" }).defaultNow().notNull(),
  thumbnailImage: text("thumbnail_image"),
  careInfo: jsonb("care_info").$type<{
    sunlight: string;
    wateringSchedule: string;
    soilType: string;
    hardinessZone: string;
    companionPlants: string[];
    commonPests: string[];
    generalNotes: string;
  }>(),
  wateringIntervalDays: integer("watering_interval_days").notNull().default(3),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("plants_user_id_idx").on(table.userId),
]);

export const plantEntries = pgTable("plant_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  plantId: text("plant_id").notNull().references(() => plants.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  note: text("note").notNull().default(""),
  images: jsonb("images").$type<Array<{
    id: string;
    filename: string;
    caption: string;
    uploadedAt: string;
  }>>().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("plant_entries_plant_id_idx").on(table.plantId),
]);

export const wateringEvents = pgTable("watering_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  plantId: text("plant_id").notNull().references(() => plants.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("watering_events_plant_id_idx").on(table.plantId),
]);

// ─── Social tables ───────────────────────────────────────────────────────────

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follows_following_id_idx").on(table.followingId),
  ]
);

export const feedItems = pgTable("feed_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"plant_added" | "entry_added" | "watered">().notNull(),
  plantId: text("plant_id").references(() => plants.id, { onDelete: "cascade" }),
  entryId: text("entry_id").references(() => plantEntries.id, { onDelete: "set null" }),
  wateringEventId: text("watering_event_id").references(() => wateringEvents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("feed_items_user_id_idx").on(table.userId),
  index("feed_items_created_at_idx").on(table.createdAt),
]);

export const likes = pgTable(
  "likes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    feedItemId: text("feed_item_id").notNull().references(() => feedItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("likes_user_feed_item_idx").on(table.userId, table.feedItemId),
  ]
);

export const comments = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feedItemId: text("feed_item_id").notNull().references(() => feedItems.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("comments_feed_item_id_idx").on(table.feedItemId),
]);

// ─── User settings ───────────────────────────────────────────────────────────

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").$type<"green" | "earth" | "ocean" | "space">().notNull().default("green"),
  gardenName: text("garden_name"),
  gardenIcon: text("garden_icon"),
  location: text("location"),
  frostDates: jsonb("frost_dates").$type<{
    lastSpringFrost: string;
    firstFallFrost: string;
    growingSeasonDays: number;
  } | null>(),
});
