import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env from monorepo root or current directory
config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is required. Please set it in the root .env file.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
  verbose: true,
  strict: true,
});

