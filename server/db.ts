import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use the new Render database if available, fallback to Replit DATABASE_URL
const databaseUrl = process.env.Inspeksjonsskjema_db || process.env.DATABASE_URL;
const isRenderDatabase = !!process.env.Inspeksjonsskjema_db;

if (!databaseUrl) {
  throw new Error(
    "Database URL must be set. Did you forget to provision a database?",
  );
}

// Render database requires SSL
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isRenderDatabase ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle(pool, { schema });
