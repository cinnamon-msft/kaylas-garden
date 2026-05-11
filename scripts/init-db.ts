/**
 * Database initialization script.
 * Run this after Aspire starts to push the schema to PostgreSQL.
 * Usage: npx tsx scripts/init-db.ts
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🗄️  Initializing database schema...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      email_verified TIMESTAMP,
      image TEXT,
      username TEXT UNIQUE,
      location TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounts (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      PRIMARY KEY (provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMP NOT NULL,
      PRIMARY KEY (identifier, token)
    );

    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      nickname TEXT,
      species TEXT NOT NULL DEFAULT '',
      date_added TIMESTAMP NOT NULL DEFAULT NOW(),
      thumbnail_image TEXT,
      care_info JSONB,
      watering_interval_days INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS plants_user_id_idx ON plants(user_id);

    CREATE TABLE IF NOT EXISTS plant_entries (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      date TIMESTAMP NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      images JSONB DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS plant_entries_plant_id_idx ON plant_entries(plant_id);

    CREATE TABLE IF NOT EXISTS watering_events (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      date TIMESTAMP NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS watering_events_plant_id_idx ON watering_events(plant_id);

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id)
    );
    CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

    CREATE TABLE IF NOT EXISTS feed_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      plant_id TEXT REFERENCES plants(id) ON DELETE CASCADE,
      entry_id TEXT REFERENCES plant_entries(id) ON DELETE SET NULL,
      watering_event_id TEXT REFERENCES watering_events(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS feed_items_user_id_idx ON feed_items(user_id);
    CREATE INDEX IF NOT EXISTS feed_items_created_at_idx ON feed_items(created_at);

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feed_item_id TEXT NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS likes_user_feed_item_idx ON likes(user_id, feed_item_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feed_item_id TEXT NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS comments_feed_item_id_idx ON comments(feed_item_id);

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'green',
      garden_name TEXT,
      garden_icon TEXT,
      location TEXT,
      frost_dates JSONB
    );

    -- Migrations for existing tables
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS garden_name TEXT;
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS garden_icon TEXT;
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS location_resolved BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS resolved_location TEXT;
    ALTER TABLE plants ADD COLUMN IF NOT EXISTS nickname TEXT;
  `);

  console.log("✅ Database schema initialized successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed to initialize database:", err);
  process.exit(1);
});
