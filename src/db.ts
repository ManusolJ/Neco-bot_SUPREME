import pg, { Pool } from "pg";

import "dotenv/config";

const { Pool: PoolClass } = pg;

// Singleton database connection pool
let necoPool: Pool | null = null;

/**
 * Initializes and returns the PostgreSQL connection pool.
 * Implements singleton pattern to reuse existing connection.
 *
 * @returns {Promise<Pool>} Database pool instance
 * @throws {Error} If required environment variables are missing
 */
export async function getDb(): Promise<Pool> {
  // Reuse existing pool if available
  if (necoPool) return necoPool;

  // Validate essential environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DATABASE) {
    throw new Error("Missing required database environment variables");
  }

  // Initialize new connection pool
  necoPool = new PoolClass({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    // Configure SSL only when explicitly enabled
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection with simple query
    const connectionDate = await necoPool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL DATABASE at: ", connectionDate.rows[0].now);
  } catch (err) {
    console.error("Database connection failed:", err);
    // Reset pool to allow reinitialization attempts
    necoPool = null;
    throw err;
  }

  return necoPool;
}
