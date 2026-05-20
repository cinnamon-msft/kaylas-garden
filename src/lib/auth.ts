import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

const { Pool } = pg;

function getAuthDb() {
  const uri = process.env["GARDENDB_URI"];
  const host = process.env["GARDENDB_HOST"];
  const database = process.env["GARDENDB_DATABASENAME"];

  let pool: pg.Pool;
  if (uri) {
    pool = new Pool({ connectionString: uri });
  } else if (host && database) {
    pool = new Pool({
      host,
      port: parseInt(process.env["GARDENDB_PORT"] || "5432", 10),
      database,
      user: process.env["GARDENDB_USERNAME"],
      password: process.env["GARDENDB_PASSWORD"],
    });
  } else {
    // During build, return a dummy - auth won't actually be called
    pool = new Pool({ connectionString: "postgresql://build:build@localhost:5432/build" });
  }
  return drizzle(pool, { schema: { users, accounts, sessions, verificationTokens } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getAuthDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
