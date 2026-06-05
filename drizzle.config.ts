import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load env from .env.local (Next.js convention) for CLI commands.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
