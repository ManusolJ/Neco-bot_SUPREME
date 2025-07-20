/**
 * @file
 * Provides a singleton PostgreSQL connection pool using `pg`.
 */

import pg, { Pool } from "pg";
import "dotenv/config";

const { Pool: PoolClass } = pg;

/** @private Holds the singleton instance of the database pool. */
let necoPool: Pool | null = null;

/**
 * Retrieves the PostgreSQL connection pool, initializing it if necessary.
 *
 * @returns A promise resolving to the active `Pool` instance.
 * @throws If DB_HOST, DB_USER, DB_PASSWORD, or DATABASE is missing.
 * @remarks
 * - Defaults DB_PORT to 5432 when undefined.
 * - Enables SSL (with `rejectUnauthorized: false`) when DB_SSL is truthy.
 */
export async function getDb(): Promise<Pool> {
  // Return existing pool if already initialized
  if (necoPool) {
    return necoPool;
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const dbPort = process.env.DB_PORT || "5432";
  const password = process.env.DB_PASSWORD;
  const database = process.env.DATABASE;

  // Ensure necessary environment variables are provided
  if (!host || !user || !password || !database) {
    throw new Error("Missing required database environment variables");
  }

  // Create a new Pool instance with configuration
  necoPool = new PoolClass({
    host: host,
    port: parseInt(dbPort, 10),
    user: user,
    password: password,
    database: database,
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
