/**
 * Provides a singleton PostgreSQL connection pool using `pg`.
 * Ensures that only one pool is created and reused across the application.
 */

import pg, { Pool } from "pg";
import "dotenv/config";

const { Pool: PoolClass } = pg;

/** Holds the singleton instance of the database pool. */
let necoPool: Pool | null = null;

/**
 * Retrieves the PostgreSQL connection pool, initializing it if necessary.
 *
 * @returns A promise resolving to the active `Pool` instance.
 * @throws If required environment variables are missing or connection fails.
 */
export async function getDb(): Promise<Pool> {
  // Return existing pool if already initialized
  if (necoPool) {
    return necoPool;
  }

  // Ensure necessary environment variables are provided
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DATABASE) {
    throw new Error("Missing required database environment variables");
  }

  // Create a new Pool instance with configuration
  necoPool = new PoolClass({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    // Enable SSL if DB_SSL is truthy, disabling certificate verification
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  });

  try {
    // Verify connection by running a simple query
    const connectionDate = await necoPool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL DATABASE at:", connectionDate.rows[0].now);
  } catch (err) {
    console.error("Database connection failed:", err);
    necoPool = null; // Reset pool for retry attempts
    throw err;
  }

  return necoPool;
}
